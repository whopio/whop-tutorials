import { prisma } from "./prisma";

type UserPlan = {
  id: string;
  name: string;
  price: number;
  checkoutUrl: string;
  allowCustomBots: boolean;
};

export async function getUserPlan(userId: string): Promise<UserPlan | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!membership || membership.status !== "ACTIVE" || !membership.plan) {
    return null;
  }

  return {
    id: membership.plan.id,
    name: membership.plan.name,
    price: membership.plan.price,
    checkoutUrl: membership.plan.checkoutUrl,
    allowCustomBots: membership.plan.allowCustomBots,
  };
}

export function canAccessBot(
  bot: { planId: string | null; type?: string; createdById?: string | null; plan?: { price: number } | null },
  userPlan: { price: number } | null,
  currentUserId?: string
): boolean {
  if (bot.type === "MODEL") {
    return !!userPlan;
  }
  if (bot.type === "USER") {
    return !!currentUserId && bot.createdById === currentUserId;
  }
  if (!bot.planId) return true; // free bot
  if (!userPlan) return false; // free user, paid bot
  return userPlan.price >= (bot.plan?.price ?? 0);
}

export const USER_BOT_LIMIT = 2;
export const MAX_KNOWLEDGE_LENGTH = 50_000;

const FREE_DAILY_LIMIT = 20;
const PAID_DAILY_LIMIT = 50;
const FREE_CONVERSATION_LIMIT = 10;

export async function getMessageCountToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.message.count({
    where: {
      conversation: { userId },
      role: "USER",
      createdAt: { gte: startOfDay },
    },
  });
}

export function isOverMessageLimit(
  count: number,
  userPlan: { price: number } | null
): boolean {
  const limit = userPlan ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;
  return count >= limit;
}

export function getConversationLimit(
  userPlan: { price: number } | null
): number | undefined {
  return userPlan ? undefined : FREE_CONVERSATION_LIMIT;
}
