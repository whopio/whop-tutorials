import { prisma } from "@/lib/prisma";
import {
  POSTS_PER_PAGE,
  TRENDING_WRITERS_COUNT,
  TRENDING_WINDOW_DAYS,
  TRENDING_WEIGHTS,
} from "@/constants/config";
import type { PublicationCategory } from "@/generated/prisma/client";

export async function getTrendingWriters(limit = TRENDING_WRITERS_COUNT) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - TRENDING_WINDOW_DAYS);

  const writers = await prisma.writer.findMany({
    include: {
      user: { select: { displayName: true, avatarUrl: true } },
      _count: { select: { followers: true, subscriptions: true } },
      posts: {
        where: { published: true, publishedAt: { gte: windowStart } },
        select: { id: true },
      },
    },
  });

  const scored = writers.map((writer) => {
    const score =
      writer._count.followers * TRENDING_WEIGHTS.followers +
      writer._count.subscriptions * TRENDING_WEIGHTS.subscribers +
      writer.posts.length * TRENDING_WEIGHTS.recentPosts;

    return { ...writer, trendingScore: score };
  });

  scored.sort((a, b) => b.trendingScore - a.trendingScore);

  return scored.slice(0, limit).map(({ posts, ...rest }) => rest);
}

export async function getRecentPosts(
  opts: { cursor?: string; limit?: number; category?: PublicationCategory } = {}
) {
  const { cursor, limit = POSTS_PER_PAGE, category } = opts;

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      ...(category ? { writer: { category } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      writer: {
        include: {
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
      _count: { select: { likes: true } },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}
