import "server-only";
import { prisma } from "./prisma";

export type ChannelTier = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
};

/** MEMBERSHIP-3: the tiers available to join on a channel. */
export async function getChannelTiers(channelId: string): Promise<ChannelTier[]> {
  return prisma.membershipTier.findMany({
    where: { channelId },
    orderBy: { priceCents: "asc" },
    select: { id: true, name: true, description: true, priceCents: true },
  });
}

/** Whether a viewer currently holds an active membership on a channel. */
export async function isActiveMember(
  userId: string,
  channelId: string,
): Promise<boolean> {
  const m = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId, channelId } },
    select: { status: true },
  });
  return m?.status === "ACTIVE";
}

/**
 * MEMBERSHIP-8: the set of comment-author user ids (from a given list) who are
 * active members of the channel, for the loyalty badge.
 */
export async function activeMemberIds(
  channelId: string,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await prisma.channelMember.findMany({
    where: { channelId, status: "ACTIVE", userId: { in: userIds } },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

/** MEMBERSHIP-10: count of a channel's current active members. */
export async function getChannelMemberCount(channelId: string): Promise<number> {
  return prisma.channelMember.count({
    where: { channelId, status: "ACTIVE" },
  });
}

export type RecentMember = {
  id: string;
  startedAt: Date;
  user: { username: string; name: string | null; avatarUrl: string | null };
  tier: { name: string } | null;
};

/**
 * MEMBERSHIP-10: the most recently joined active members of a channel, for the
 * creator-facing membership roster.
 */
export async function getRecentMembers(
  channelId: string,
  take = 8,
): Promise<RecentMember[]> {
  const rows = await prisma.channelMember.findMany({
    where: { channelId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      startedAt: true,
      user: { select: { username: true, name: true, avatarUrl: true } },
      tier: { select: { name: true } },
    },
  });
  return rows;
}
