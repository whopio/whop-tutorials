import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@/generated/prisma/client";

export async function hasActiveSubscription(
  userId: string,
  writerId: string
) {
  const sub = await prisma.subscription.findUnique({
    where: { userId_writerId: { userId, writerId } },
  });
  return sub?.status === "ACTIVE";
}

export async function canAccessPaidContent(
  userId: string,
  writerId: string
) {
  const sub = await prisma.subscription.findUnique({
    where: { userId_writerId: { userId, writerId } },
  });
  if (!sub) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "CANCELLED") return false;

  // Cancelled subs with remaining period still get access
  if (sub.status === "CANCELLED" && sub.currentPeriodEnd) {
    return sub.currentPeriodEnd > new Date();
  }

  return sub.status === "ACTIVE";
}

export async function createSubscription(
  userId: string,
  writerId: string,
  whopMembershipId: string
) {
  return prisma.subscription.upsert({
    where: { userId_writerId: { userId, writerId } },
    create: {
      userId,
      writerId,
      whopMembershipId,
      status: "ACTIVE",
    },
    update: {
      whopMembershipId,
      status: "ACTIVE",
      cancelledAt: null,
    },
  });
}

export async function updateSubscriptionStatus(
  whopMembershipId: string,
  status: SubscriptionStatus,
  periodEnd?: Date
) {
  return prisma.subscription.update({
    where: { whopMembershipId },
    data: {
      status,
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
    },
  });
}

export async function cancelSubscription(whopMembershipId: string) {
  return prisma.subscription.update({
    where: { whopMembershipId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}

export async function getSubscriptionsByWriter(writerId: string) {
  return prisma.subscription.findMany({
    where: { writerId, status: "ACTIVE" },
    include: {
      user: {
        select: { displayName: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
