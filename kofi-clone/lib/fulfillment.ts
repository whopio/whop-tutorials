import { prisma } from "./prisma";
import { whopsdk } from "./whop";
import { formatUsd } from "./fees";
import { notifyCreator } from "@/services/whop";

type CreatorLike = { whopCompanyId: string | null };

async function notify(creator: CreatorLike, n: { title: string; subtitle?: string; content: string; iconUserId?: string }) {
  if (!creator.whopCompanyId) return;
  await notifyCreator({ companyId: creator.whopCompanyId, restPath: "/dashboard", ...n });
}

/** Complete a tip (idempotent) + notify. */
export async function markSupportCompleted(supportId: string, whopPaymentId: string) {
  const support = await prisma.support.findUnique({ where: { id: supportId }, include: { creator: true } });
  if (!support || support.status === "COMPLETED") return support;
  const updated = await prisma.support.update({
    where: { id: supportId },
    data: { status: "COMPLETED", whopPaymentId },
  });
  const word = support.coffees === 1 ? "coffee" : "coffees";
  await notify(support.creator, {
    title: "New supporter",
    subtitle: `${support.supporterName} bought you ${support.coffees} ${word}`,
    content: support.message?.trim()
      ? `"${support.message.trim()}" — ${formatUsd(support.amountCents)}`
      : `You received ${formatUsd(support.amountCents)}!`,
  });
  return updated;
}

/**
 * Best-effort healing: complete any PENDING tips whose Whop payment has settled.
 * Covers a missed webhook or a checkout-return confirm that didn't land. Idempotent
 * and safe to call on a page view; only runs when the creator has pending tips.
 */
export async function reconcilePendingSupports(creatorId: string, whopCompanyId: string) {
  const pending = await prisma.support.findMany({
    where: { creatorId, status: "PENDING" },
    select: { id: true },
  });
  if (pending.length === 0) return;
  const pendingIds = new Set(pending.map((s) => s.id));

  try {
    let scanned = 0;
    for await (const payment of whopsdk.payments.list({ company_id: whopCompanyId, direction: "desc" })) {
      const p = payment as unknown as {
        id: string;
        status?: string;
        substatus?: string;
        metadata?: Record<string, unknown> | null;
      };
      const ref = typeof p.metadata?.ref === "string" ? p.metadata.ref : null;
      const settled = p.status === "paid" || p.substatus === "succeeded";
      if (ref && settled && pendingIds.has(ref)) {
        await markSupportCompleted(ref, p.id);
        pendingIds.delete(ref);
        if (pendingIds.size === 0) break;
      }
      if (++scanned >= 60) break;
    }
  } catch (err: unknown) {
    console.error("reconcilePendingSupports failed:", err);
  }
}

export async function markSupportRefunded(whopPaymentId: string) {
  const support = await prisma.support.findUnique({ where: { whopPaymentId } });
  if (support && support.status !== "REFUNDED") {
    await prisma.support.update({ where: { id: support.id }, data: { status: "REFUNDED" } });
  }
}

/** Complete a shop order (idempotent) + bump sales + notify. */
export async function completeOrder(orderId: string, whopPaymentId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { creator: true, product: true } });
  if (!order || order.status === "COMPLETED") return;
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "COMPLETED", whopPaymentId } }),
    prisma.product.update({ where: { id: order.productId }, data: { salesCount: { increment: 1 } } }),
  ]);
  await notify(order.creator, {
    title: "New sale",
    subtitle: order.product.title,
    content: `${order.buyerName} bought ${order.product.title} for ${formatUsd(order.amountCents)}`,
  });
}

/** Activate (or renew) a membership (idempotent upsert). */
export async function activateMembership(params: {
  creatorId: string;
  userId: string;
  tierId: string;
  whopMembershipId?: string;
}) {
  const tier = await prisma.tier.findUnique({ where: { id: params.tierId }, include: { creator: true } });
  if (!tier) return;
  const existing = await prisma.membership.findUnique({
    where: { userId_tierId: { userId: params.userId, tierId: params.tierId } },
  });
  await prisma.membership.upsert({
    where: { userId_tierId: { userId: params.userId, tierId: params.tierId } },
    update: { status: "ACTIVE", whopMembershipId: params.whopMembershipId ?? undefined },
    create: {
      creatorId: params.creatorId,
      userId: params.userId,
      tierId: params.tierId,
      status: "ACTIVE",
      whopMembershipId: params.whopMembershipId ?? null,
    },
  });
  if (!existing) {
    await notify(tier.creator, {
      title: "New member",
      subtitle: tier.name,
      content: `Someone just joined your "${tier.name}" tier (${formatUsd(tier.priceCents)}/mo)`,
    });
  }
}

export async function deactivateMembership(whopMembershipId: string) {
  const m = await prisma.membership.findUnique({ where: { whopMembershipId } });
  if (m && m.status !== "CANCELED" && m.status !== "EXPIRED") {
    await prisma.membership.update({ where: { id: m.id }, data: { status: "CANCELED" } });
  }
}

/** Unified fulfillment driven by a payment's metadata (confirm endpoint + payment.succeeded webhook). */
export async function fulfillFromMetadata(
  meta: Record<string, unknown> | null | undefined,
  paymentId: string,
) {
  if (!meta) return;
  const kind = meta.kind;
  if (kind === "tip" && typeof meta.supportId === "string") {
    return markSupportCompleted(meta.supportId, paymentId);
  }
  if (kind === "shop" && typeof meta.orderId === "string") {
    return completeOrder(meta.orderId, paymentId);
  }
  if (
    kind === "membership" &&
    typeof meta.creatorId === "string" &&
    typeof meta.userId === "string" &&
    typeof meta.tierId === "string"
  ) {
    return activateMembership({ creatorId: meta.creatorId, userId: meta.userId, tierId: meta.tierId });
  }
}
