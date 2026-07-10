import "server-only";
import { prisma } from "./prisma";

/**
 * PLATFORM-1/2/3: verified-and-idempotent webhook intake. The route verifies the
 * signature (whopsdk.webhooks.unwrap) and calls this. Each handler runs its
 * writes ATOMICALLY in a single $transaction whose FIRST write is the
 * `WebhookEvent` marker — so a duplicate delivery (concurrent OR repeat) hits the
 * primary-key conflict and the entire transaction rolls back, undoing every side
 * effect. The dedupe is therefore the real guard, not just the per-row unique
 * constraints. A non-duplicate failure propagates so the route 5xx's and Whop
 * retries; a duplicate is swallowed and acknowledged (200).
 *
 * Money flows are keyed off the checkout metadata we set server-side
 * (kind/channelId/tierId/viewerUserId/amountCents/feeCents), which Whop copies
 * onto the payment + membership — so we never map Whop ids back, and a viewer
 * can't forge the amount or fee (metadata is never client-sourced).
 */
export type WebhookEnvelope = {
  type: string;
  id: string;
  data: Record<string, unknown>;
};

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// Monetary values come back as strings in metadata; round to whole cents.
function int(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function meta(data: Record<string, unknown>): Record<string, unknown> {
  const m = data.metadata;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : {};
}

/** Prisma unique-constraint violation (the event id, or a per-payment key). */
function isUniqueViolation(e: unknown): boolean {
  return Boolean(
    e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002",
  );
}

// The processed-event marker. Used as the FIRST write inside every handler's
// $transaction so a duplicate aborts the whole transaction atomically; also
// awaited standalone on no-op/ack paths so those events aren't reprocessed.
const eventWrite = (id: string) =>
  prisma.webhookEvent.create({ data: { id, source: "whop" } });

export async function processWebhookEvent(event: WebhookEnvelope): Promise<void> {
  if (!event.id) return;

  // PLATFORM-2 fast path: skip events already fully processed (a sequential
  // redelivery) so we don't redo handler work. The atomic event-id write inside
  // each handler covers the concurrent race this read can miss.
  const seen = await prisma.webhookEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (seen) return;

  try {
    switch (event.type) {
      case "membership.activated":
        await onMembershipActivated(event.id, event.data);
        break;
      case "membership.deactivated":
        await onMembershipDeactivated(event.id, event.data);
        break;
      case "payment.succeeded":
        await onPaymentSucceeded(event.id, event.data);
        break;
      case "refund.created":
        await onRefundCreated(event.id, event.data);
        break;
      default:
        await eventWrite(event.id); // ack unknown types; no side effect
        break;
    }
  } catch (e) {
    // A unique-constraint violation means a racing/repeat delivery already
    // recorded this event (or its payment) and its writes won — ours rolled back
    // atomically. Treat as already-processed (200). Re-throw anything else so the
    // route returns 5xx and Whop retries.
    if (isUniqueViolation(e)) return;
    throw e;
  }
}

/** MEMBERSHIP-5: grant the entitlement + alert the creator (atomically). */
async function onMembershipActivated(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const m = meta(data);
  const channelId = str(m.channelId);
  const viewerUserId = str(m.viewerUserId);
  const tierId = str(m.tierId) ?? null;
  const whopMembershipId = str(data.id) ?? null;
  if (!channelId || !viewerUserId) {
    await eventWrite(eventId);
    return;
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { userId: true },
  });

  await prisma.$transaction([
    eventWrite(eventId),
    prisma.channelMember.upsert({
      where: { userId_channelId: { userId: viewerUserId, channelId } },
      create: {
        userId: viewerUserId,
        channelId,
        tierId,
        status: "ACTIVE",
        whopMembershipId,
      },
      update: { status: "ACTIVE", tierId, whopMembershipId },
    }),
    ...(channel
      ? [
          prisma.notification.create({
            data: {
              recipientId: channel.userId,
              type: "NEW_MEMBER",
              title: "New channel member",
              body: "Someone just joined your channel memberships.",
              data: { channelId },
            },
          }),
        ]
      : []),
  ]);
}

/** MEMBERSHIP-5: revoke the entitlement (by membership id, with a metadata fallback). */
async function onMembershipDeactivated(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const m = meta(data);
  const whopMembershipId = str(data.id);
  const channelId = str(m.channelId);
  const viewerUserId = str(m.viewerUserId);

  // Interactive transaction: record the event first (atomic dedupe), then revoke
  // by membership id, falling back to (channel, viewer) if the id matched no row.
  await prisma.$transaction(async (tx) => {
    await tx.webhookEvent.create({ data: { id: eventId, source: "whop" } });
    if (whopMembershipId) {
      const res = await tx.channelMember.updateMany({
        where: { whopMembershipId },
        data: { status: "INACTIVE" },
      });
      if (res.count > 0) return;
    }
    if (channelId && viewerUserId) {
      await tx.channelMember.updateMany({
        where: { userId: viewerUserId, channelId },
        data: { status: "INACTIVE" },
      });
    }
  });
}

/**
 * TIPS-8/10/11 + PAYOUTS-8: record a successful charge. A tip writes the Tip,
 * ledger entry, highlighted comment, and creator notification in ONE atomic
 * transaction (with the event marker); a membership renewal adds a ledger entry.
 */
async function onPaymentSucceeded(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const m = meta(data);
  const kind = str(m.kind);
  const whopPaymentId = str(data.id);
  if (!whopPaymentId) {
    await eventWrite(eventId);
    return;
  }

  const channelId = str(m.channelId);
  const amountCents = int(m.amountCents);
  const feeCents = int(m.feeCents);
  const netCents = Math.max(0, amountCents - feeCents);

  if (kind === "tip") {
    const supporterUserId = str(m.viewerUserId);
    const message = str(m.message) || null;
    if (!channelId || !supporterUserId || amountCents <= 0) {
      await eventWrite(eventId);
      return;
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { userId: true },
    });

    // The video can be deleted between checkout and delivery; record the tip
    // without it (and skip the comment) rather than failing the event forever.
    let videoId = str(m.videoId) ?? null;
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true },
      });
      if (!video) videoId = null;
    }

    await prisma.$transaction([
      eventWrite(eventId),
      prisma.tip.create({
        data: {
          supporterId: supporterUserId,
          channelId,
          videoId,
          amountCents,
          feeCents,
          netCents,
          message,
          whopPaymentId,
        },
      }),
      prisma.earningsLedger.create({
        data: {
          channelId,
          source: "SUPER_THANKS",
          grossCents: amountCents,
          feeCents,
          netCents,
          whopPaymentId,
          videoId,
        },
      }),
      ...(videoId
        ? [
            prisma.comment.create({
              data: {
                videoId,
                authorId: supporterUserId,
                body: message ?? "Cheers!",
                status: "PUBLISHED",
                isSuperThanks: true,
                superThanksAmount: amountCents,
              },
            }),
          ]
        : []),
      ...(channel
        ? [
            prisma.notification.create({
              data: {
                recipientId: channel.userId,
                type: "SUPER_THANKS",
                title: "Cheers received",
                body: `You received $${(amountCents / 100).toFixed(2)} in Cheers.`,
                data: { channelId, videoId },
              },
            }),
          ]
        : []),
    ]);
    return;
  }

  if (kind === "membership" && channelId && amountCents > 0) {
    await prisma.$transaction([
      eventWrite(eventId),
      prisma.earningsLedger.create({
        data: {
          channelId,
          source: "MEMBERSHIP",
          grossCents: amountCents,
          feeCents,
          netCents,
          whopPaymentId,
        },
      }),
    ]);
    return;
  }

  // Recognized payment with no actionable kind/metadata — ack so we don't retry.
  await eventWrite(eventId);
}

/** PAYOUTS-11: reflect a refund as an offsetting ledger entry. */
async function onRefundCreated(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payment = data.payment;
  const originalPaymentId =
    (payment && typeof payment === "object"
      ? str((payment as Record<string, unknown>).id)
      : undefined) ?? str(data.payment_id);
  if (!originalPaymentId) {
    await eventWrite(eventId);
    return;
  }

  const original = await prisma.earningsLedger.findUnique({
    where: { whopPaymentId: originalPaymentId },
    select: {
      channelId: true,
      source: true,
      grossCents: true,
      feeCents: true,
      netCents: true,
      videoId: true,
    },
  });
  if (!original) {
    await eventWrite(eventId);
    return;
  }

  // One offset per ORIGINAL payment (keyed `refund_<id>`, deduped by the unique
  // whopPaymentId): redelivered/duplicate refund events never double-count into a
  // negative balance. We conservatively offset the full original; exact
  // partial-refund amounts would need Whop's refund-amount field (a production
  // enhancement).
  const refundKey = `refund_${originalPaymentId}`;
  await prisma.$transaction([
    eventWrite(eventId),
    prisma.earningsLedger.create({
      data: {
        channelId: original.channelId,
        source: original.source,
        grossCents: -original.grossCents,
        feeCents: -original.feeCents,
        netCents: -original.netCents,
        videoId: original.videoId,
        whopPaymentId: refundKey,
      },
    }),
  ]);
}
