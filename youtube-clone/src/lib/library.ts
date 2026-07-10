import "server-only";
import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { FeedVideo } from "@/components/feed/video-card";

const cardSelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  durationSeconds: true,
  viewCount: true,
  publishedAt: true,
  channel: { select: { handle: true, name: true, avatarUrl: true } },
} as const;

/** A personal list shows public/unlisted videos plus the viewer's OWN private
 * ones (it's their library; hiding what they just saved reads as a bug). */
const viewableBy = (userId: string): Prisma.VideoWhereInput => ({
  status: "READY",
  OR: [
    { visibility: { in: ["PUBLIC", "UNLISTED"] } },
    { channel: { userId } },
  ],
});

/** LIB-7: the viewer's Watch later list, most-recently-added first. */
export async function getWatchLater(userId: string): Promise<FeedVideo[]> {
  const rows = await prisma.watchLater.findMany({
    where: { userId, video: viewableBy(userId) },
    orderBy: { addedAt: "desc" },
    take: 100,
    select: { video: { select: cardSelect } },
  });
  return rows.map((r) => r.video);
}

/** LIB-8: videos the viewer liked, newest-liked first (from SOCIAL Reactions). */
export async function getLikedVideos(userId: string): Promise<FeedVideo[]> {
  const rows = await prisma.reaction.findMany({
    where: { userId, type: "LIKE", video: viewableBy(userId) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { video: { select: cardSelect } },
  });
  return rows.map((r) => r.video);
}

/** FEED-8: newest public videos from channels the viewer subscribes to. Waves
 * live in their own vertical feed, so keep the 16:9 grid to long-form. */
export async function getSubscriptionsFeed(userId: string): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: {
      visibility: "PUBLIC",
      status: "READY",
      isShort: false,
      channel: { subscribers: { some: { subscriberId: userId } } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: cardSelect,
  });
}

/** LIB-13: the channels the viewer is subscribed to (for the guide list). */
export async function getSubscribedChannels(userId: string) {
  const rows = await prisma.subscription.findMany({
    where: { subscriberId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      channel: { select: { handle: true, name: true, avatarUrl: true } },
    },
  });
  return rows.map((r) => r.channel);
}

/** Whether a given video is in the viewer's Watch later (WATCH-12b initial state). */
export async function isInWatchLater(
  userId: string,
  videoId: string,
): Promise<boolean> {
  const row = await prisma.watchLater.findUnique({
    where: { userId_videoId: { userId, videoId } },
    select: { id: true },
  });
  return Boolean(row);
}
