import "server-only";
import { prisma } from "./prisma";
import type { FeedVideo } from "@/components/feed/video-card";
import type { VideoCategory } from "@/generated/prisma/client";

const cardSelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  durationSeconds: true,
  viewCount: true,
  publishedAt: true,
  channel: { select: { handle: true, name: true, avatarUrl: true } },
} as const;

/** Trending: the most-viewed public videos, newest breaking ties. */
export async function getTrending(): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: { status: "READY", visibility: "PUBLIC", isShort: false },
    orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }],
    take: 50,
    select: cardSelect,
  });
}

/** A single Explore category feed — newest public videos in that category. */
export async function getByCategory(
  category: VideoCategory,
): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: { status: "READY", visibility: "PUBLIC", category, isShort: false },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: cardSelect,
  });
}
