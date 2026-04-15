import { prisma } from "./prisma";

export type UserTier = "FREE" | "PRO";

const FREE_DAILY_LIMIT = 5;

export async function getUserTier(userId: string): Promise<UserTier> {
  const membership = await prisma.membership.findUnique({
    where: { userId },
  });

  if (membership?.status === "ACTIVE") return "PRO";
  return "FREE";
}

export async function checkGenerationLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const tier = await getUserTier(userId);

  // Pro users have unlimited generations
  if (tier === "PRO") {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.generation.count({
    where: {
      userId,
      createdAt: { gte: today },
    },
  });

  return {
    allowed: count < FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - count),
    limit: FREE_DAILY_LIMIT,
  };
}

export async function getCheckoutUrl(): Promise<string | null> {
  const plan = await prisma.plan.findFirst({
    where: { isActive: true },
  });
  return plan?.checkoutUrl ?? null;
}
