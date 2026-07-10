import "server-only";
import { prisma } from "./prisma";
import type { FeedVideo } from "@/components/feed/video-card";

export type ShortItem = {
  id: string;
  title: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  channel: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
  };
  myReaction: "LIKE" | "DISLIKE" | null;
  isSubscribed: boolean;
};

const shortSelect = {
  id: true,
  title: true,
  videoUrl: true,
  thumbnailUrl: true,
  viewCount: true,
  channel: { select: { id: true, handle: true, name: true, avatarUrl: true } },
} as const;

/**
 * FEED-13 / DESIGN-13: the vertical Shorts feed. Counts (likes, published
 * comments) come from grouped aggregates; the viewer's own like + subscribe
 * state is fetched in one pass and mapped on. An optional startId is floated to
 * the front so a deep link (e.g. the channel Shorts grid) opens on that Short.
 */
export async function getShortsFeed(
  viewerId: string | null,
  startId?: string,
): Promise<ShortItem[]> {
  const rows = await prisma.video.findMany({
    where: { isShort: true, status: "READY", visibility: "PUBLIC" },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 40,
    select: shortSelect,
  });

  // Make sure a deep-linked Short is present even if it's outside the first 40.
  if (startId && !rows.some((r) => r.id === startId)) {
    const extra = await prisma.video.findFirst({
      where: {
        id: startId,
        isShort: true,
        status: "READY",
        visibility: "PUBLIC",
      },
      select: shortSelect,
    });
    if (extra) rows.unshift(extra);
  }

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const channelIds = [...new Set(rows.map((r) => r.channel.id))];

  const [likeGroups, commentGroups, myReactions, mySubs] = await Promise.all([
    prisma.reaction.groupBy({
      by: ["videoId"],
      where: { videoId: { in: ids }, type: "LIKE" },
      _count: true,
    }),
    prisma.comment.groupBy({
      by: ["videoId"],
      where: { videoId: { in: ids }, status: "PUBLISHED" },
      _count: true,
    }),
    viewerId
      ? prisma.reaction.findMany({
          where: { userId: viewerId, videoId: { in: ids } },
          select: { videoId: true, type: true },
        })
      : Promise.resolve([]),
    viewerId
      ? prisma.subscription.findMany({
          where: { subscriberId: viewerId, channelId: { in: channelIds } },
          select: { channelId: true },
        })
      : Promise.resolve([]),
  ]);

  const likeBy = new Map(likeGroups.map((g) => [g.videoId, g._count]));
  const commentBy = new Map(commentGroups.map((g) => [g.videoId, g._count]));
  const reactionBy = new Map(myReactions.map((r) => [r.videoId, r.type]));
  const subbed = new Set(mySubs.map((s) => s.channelId));

  const items: ShortItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    videoUrl: r.videoUrl,
    thumbnailUrl: r.thumbnailUrl,
    viewCount: r.viewCount,
    likeCount: likeBy.get(r.id) ?? 0,
    commentCount: commentBy.get(r.id) ?? 0,
    channel: r.channel,
    myReaction: reactionBy.get(r.id) ?? null,
    isSubscribed: subbed.has(r.channel.id),
  }));

  // Float the deep-linked Short to the front.
  if (startId) {
    const i = items.findIndex((it) => it.id === startId);
    if (i > 0) items.unshift(items.splice(i, 1)[0]);
  }
  return items;
}

/** CHANNEL-12: a channel's Shorts as portrait cards (newest first). */
export async function getChannelShorts(channelId: string): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: {
      channelId,
      isShort: true,
      status: "READY",
      visibility: "PUBLIC",
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 60,
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      durationSeconds: true,
      viewCount: true,
      publishedAt: true,
      channel: { select: { handle: true, name: true, avatarUrl: true } },
    },
  });
}

/** FEED-13: a row of recent public Shorts for the home shelf. */
export async function getHomeShorts(take = 12): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: { isShort: true, status: "READY", visibility: "PUBLIC" },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      durationSeconds: true,
      viewCount: true,
      publishedAt: true,
      channel: { select: { handle: true, name: true, avatarUrl: true } },
    },
  });
}

/** Whether a channel has any public Shorts (drives the channel Shorts tab). */
export async function channelHasShorts(channelId: string): Promise<boolean> {
  const row = await prisma.video.findFirst({
    where: {
      channelId,
      isShort: true,
      status: "READY",
      visibility: "PUBLIC",
    },
    select: { id: true },
  });
  return Boolean(row);
}
