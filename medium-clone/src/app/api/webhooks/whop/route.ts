import { waitUntil } from "@vercel/functions";
import type { NextRequest } from "next/server";
import { getWhop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

interface WebhookData {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface MembershipPayload {
  id?: string;
  user?: { id?: string; email?: string };
  plan?: { id?: string };
  expires_at?: string | number;
  expiration_at?: string | number;
  current_period_end?: string | number;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentPayload {
  id?: string;
  membership?: { id?: string };
  membership_id?: string;
  user?: { id?: string; email?: string };
  plan?: { id?: string };
  subtotal?: number;
  metadata?: Record<string, unknown>;
}

function toDate(value: string | number | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function findUserByWhopId(whopUserId: string) {
  return prisma.user.findUnique({ where: { whopUserId } });
}

async function handleMembershipActivated(data: MembershipPayload) {
  const whopMembershipId = data.id;
  const whopUserId = data.user?.id;
  const whopPlanId = data.plan?.id;
  if (!whopMembershipId || !whopUserId || !whopPlanId) return;

  const user = await findUserByWhopId(whopUserId);
  if (!user) return;

  const currentPeriodEnd =
    toDate(data.current_period_end) ?? toDate(data.expires_at) ?? toDate(data.expiration_at);
  if (!currentPeriodEnd) return;

  await prisma.plusMembership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      whopMembershipId,
      whopPlanId,
      status: "ACTIVE",
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      priceCents: Math.round((data.metadata?.amountCents as number | undefined) ?? 0),
    },
    update: {
      whopMembershipId,
      whopPlanId,
      status: "ACTIVE",
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "PLUS_RENEWED",
      entityId: whopMembershipId,
    },
  });
}

async function handleMembershipDeactivated(data: MembershipPayload) {
  const whopMembershipId = data.id;
  if (!whopMembershipId) return;
  await prisma.plusMembership.updateMany({
    where: { whopMembershipId },
    data: { status: "EXPIRED" },
  });
}

async function handleTipSucceeded(data: PaymentPayload) {
  const meta = data.metadata ?? {};
  const storyId = meta.storyId as string | undefined;
  const tipperUserId = meta.tipperUserId as string | undefined;
  const writerUserId = meta.writerUserId as string | undefined;
  const amountCents = Number(meta.amountCents ?? Math.round((data.subtotal ?? 0) * 100));
  const applicationFeeCents = Number(meta.applicationFeeCents ?? 0);
  const whopPaymentId = data.id;

  if (!storyId || !tipperUserId || !writerUserId || !whopPaymentId || !amountCents) return;

  await prisma.tip.upsert({
    where: { whopPaymentId },
    create: {
      tipperUserId,
      writerUserId,
      storyId,
      amountCents,
      applicationFeeCents,
      whopPaymentId,
      status: "SUCCEEDED",
    },
    update: { status: "SUCCEEDED" },
  });

  await prisma.notification.create({
    data: { userId: writerUserId, type: "TIP_RECEIVED", entityId: storyId },
  });
}

async function handlePaymentSucceeded(data: PaymentPayload) {
  const kind = data.metadata?.kind as string | undefined;

  if (kind === "tip") {
    await handleTipSucceeded(data);
    return;
  }

  // Plus subscription renewal (or first payment) — keep currentPeriodEnd fresh.
  const whopMembershipId = data.membership?.id ?? data.membership_id;
  if (whopMembershipId) {
    const existing = await prisma.plusMembership.findUnique({
      where: { whopMembershipId },
    });
    if (existing) {
      await prisma.plusMembership.update({
        where: { whopMembershipId },
        data: {
          status: "ACTIVE",
          priceCents: Math.round((data.subtotal ?? 0) * 100),
        },
      });
      await prisma.notification.create({
        data: { userId: existing.userId, type: "PLUS_RENEWED", entityId: whopMembershipId },
      });
    }
  }

  // Partner Program payouts land in Part 6 — they use the Transfers API and don't fire here.
}

async function handlePaymentFailed(_data: PaymentPayload) {
  // Optional: notify the user. Skipped in v1.
}

interface RefundPayload {
  id?: string;
  payment?: { id?: string };
}

async function handleRefundCreated(data: RefundPayload) {
  // Mark the Tip as REFUNDED. We don't roll back the writer's balance here — Whop
  // handles fund reversal on the connected account at the payment-processor level.
  // The refund payload references the original payment via `payment.id` (NOT
  // `id` — `id` is the refund's own id, e.g. `rf_...`).
  const whopPaymentId = data.payment?.id;
  if (!whopPaymentId) return;
  await prisma.tip.updateMany({
    where: { whopPaymentId },
    data: { status: "REFUNDED" },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: WebhookData;
  try {
    webhookData = getWhop().webhooks.unwrap(bodyText, { headers }) as unknown as WebhookData;
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  // Idempotency — drop duplicate deliveries.
  const existing = await prisma.webhookEvent.findUnique({ where: { id: webhookData.id } });
  if (existing) return new Response("Already processed", { status: 200 });
  await prisma.webhookEvent.create({
    data: { id: webhookData.id, eventType: webhookData.type },
  });

  switch (webhookData.type) {
    case "membership.activated":
      waitUntil(handleMembershipActivated(webhookData.data as MembershipPayload));
      break;
    case "membership.deactivated":
      waitUntil(handleMembershipDeactivated(webhookData.data as MembershipPayload));
      break;
    case "payment.succeeded":
      waitUntil(handlePaymentSucceeded(webhookData.data as PaymentPayload));
      break;
    case "payment.failed":
      waitUntil(handlePaymentFailed(webhookData.data as PaymentPayload));
      break;
    case "refund.created":
      waitUntil(handleRefundCreated(webhookData.data as RefundPayload));
      break;
    default:
      break;
  }

  return new Response("OK", { status: 200 });
}
