import "server-only";
import { prisma } from "./prisma";
import type { VideoCategory } from "@/generated/prisma/client";
import type { FeedVideo } from "@/components/feed/video-card";

const channelSelect = { handle: true, name: true, avatarUrl: true } as const;
const cardSelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  durationSeconds: true,
  viewCount: true,
  publishedAt: true,
  channel: { select: channelSelect },
} as const;

/** FEED-1/4/5: public, READY long-form videos for the home grid (Shorts live in
 * their own vertical feed at /shorts), newest first, optionally filtered to a
 * category by the home chip bar. */
export async function getFeedVideos(
  take = 24,
  category?: VideoCategory,
): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: {
      visibility: "PUBLIC",
      status: "READY",
      isShort: false,
      ...(category ? { category } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take,
    select: cardSelect,
  });
}

/**
 * FEED-9: the related / up-next rail — other public, READY videos, newest
 * first, excluding the current video. (Category/channel affinity is a later
 * refinement; for now recency keeps the rail populated.)
 */
export async function getRelatedVideos(
  videoId: string,
  take = 16,
): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: {
      visibility: "PUBLIC",
      status: "READY",
      isShort: false,
      id: { not: videoId },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take,
    select: cardSelect,
  });
}
