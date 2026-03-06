import { prisma } from "@/lib/prisma";
import type { PublicationCategory } from "@/generated/prisma/client";

export async function getWriterByHandle(handle: string) {
  return prisma.writer.findUnique({
    where: { handle },
    include: {
      user: { select: { displayName: true, avatarUrl: true, email: true } },
      _count: { select: { followers: true, subscriptions: true } },
    },
  });
}

export async function createWriter(
  userId: string,
  data: {
    handle: string;
    name: string;
    bio?: string;
    avatarUrl?: string;
    category?: PublicationCategory;
  }
) {
  const existing = await prisma.writer.findUnique({
    where: { handle: data.handle },
  });
  if (existing) throw new Error("Handle already taken");

  return prisma.writer.create({
    data: {
      userId,
      handle: data.handle,
      name: data.name,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      category: data.category,
    },
  });
}

export async function updateWriter(
  writerId: string,
  data: {
    name?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    category?: PublicationCategory;
    whopCompanyId?: string;
    whopProductId?: string;
    whopPlanId?: string;
    whopChatChannelId?: string;
    kycCompleted?: boolean;
    monthlyPriceInCents?: number;
    chatPublic?: boolean;
  }
) {
  return prisma.writer.update({
    where: { id: writerId },
    data,
  });
}

export async function getWriterStats(writerId: string) {
  const [subscriberCount, followerCount, totalViews, postCount] =
    await Promise.all([
      prisma.subscription.count({
        where: { writerId, status: "ACTIVE" },
      }),
      prisma.follow.count({ where: { writerId } }),
      prisma.post.aggregate({
        where: { writerId, published: true },
        _sum: { viewCount: true },
      }),
      prisma.post.count({ where: { writerId, published: true } }),
    ]);

  return {
    subscribers: subscriberCount,
    followers: followerCount,
    totalViews: totalViews._sum.viewCount ?? 0,
    totalPosts: postCount,
  };
}

export async function toggleFollow(userId: string, writerId: string) {
  const existing = await prisma.follow.findUnique({
    where: { userId_writerId: { userId, writerId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return { following: false };
  }

  await prisma.follow.create({ data: { userId, writerId } });
  return { following: true };
}

export async function isFollowing(userId: string, writerId: string) {
  const follow = await prisma.follow.findUnique({
    where: { userId_writerId: { userId, writerId } },
  });
  return !!follow;
}
