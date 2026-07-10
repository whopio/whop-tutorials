import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "./prisma";
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

/**
 * Resolve a `/@handle` route param to a channel (or 404). Shared by the channel
 * layout and its tab pages (CHANNEL-3/4). The `@` prefix is required at runtime
 * because a folder literally named `@[handle]` would be a parallel-route slot.
 */
export async function resolveChannel(raw: string) {
  const decoded = decodeURIComponent(raw);
  if (!decoded.startsWith("@")) notFound();
  const channel = await prisma.channel.findUnique({
    where: { handle: decoded.slice(1).toLowerCase() },
    select: {
      id: true,
      userId: true,
      name: true,
      handle: true,
      avatarUrl: true,
      bannerUrl: true,
      description: true,
      createdAt: true,
      membershipsEnabled: true,
    },
  });
  if (!channel) notFound();
  return channel;
}

/** A channel's public, READY videos, newest first (CHANNEL-10). */
export async function getChannelVideos(channelId: string): Promise<FeedVideo[]> {
  return prisma.video.findMany({
    where: { channelId, visibility: "PUBLIC", status: "READY", isShort: false },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 30,
    select: cardSelect,
  });
}

export async function getChannelVideoCount(channelId: string): Promise<number> {
  return prisma.video.count({
    where: { channelId, visibility: "PUBLIC", status: "READY", isShort: false },
  });
}
