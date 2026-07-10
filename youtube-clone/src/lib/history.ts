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

export type HistoryItem = { video: FeedVideo; progressSeconds: number };

/** LIB-2: the saved resume position for a video, or 0 if none / already finished. */
export async function getResumePosition(
  userId: string,
  videoId: string,
): Promise<number> {
  const h = await prisma.watchHistory.findUnique({
    where: { userId_videoId: { userId, videoId } },
    select: { positionSeconds: true, completed: true },
  });
  return h && !h.completed ? h.positionSeconds : 0;
}

/** A history row stays visible for public/unlisted videos plus the viewer's
 * OWN private ones (it's their history; their own uploads always show). */
const viewableBy = (userId: string): Prisma.VideoWhereInput => ({
  status: "READY",
  OR: [
    { visibility: { in: ["PUBLIC", "UNLISTED"] } },
    { channel: { userId } },
  ],
});

/** LIB-1: the viewer's watch history, most-recently-watched first. */
export async function getHistory(userId: string): Promise<HistoryItem[]> {
  const rows = await prisma.watchHistory.findMany({
    where: {
      userId,
      video: viewableBy(userId),
    },
    orderBy: { lastWatchedAt: "desc" },
    take: 100,
    select: {
      positionSeconds: true,
      completed: true,
      video: { select: cardSelect },
    },
  });
  return rows.map((r) => ({
    video: r.video,
    progressSeconds: r.completed ? r.video.durationSeconds : r.positionSeconds,
  }));
}

/** LIB-4: in-progress, not-yet-finished videos for the Continue-watching shelf. */
export async function getContinueWatching(
  userId: string,
): Promise<HistoryItem[]> {
  const rows = await prisma.watchHistory.findMany({
    where: {
      userId,
      completed: false,
      positionSeconds: { gt: 5 },
      video: viewableBy(userId),
    },
    orderBy: { lastWatchedAt: "desc" },
    take: 12,
    select: { positionSeconds: true, video: { select: cardSelect } },
  });
  return rows.map((r) => ({ video: r.video, progressSeconds: r.positionSeconds }));
}

/** LIB-5: whether the viewer has paused watch history. */
export async function isHistoryPaused(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { historyPaused: true },
  });
  return Boolean(u?.historyPaused);
}
