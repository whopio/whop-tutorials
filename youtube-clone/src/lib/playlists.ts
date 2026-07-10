import "server-only";
import { prisma } from "./prisma";
import type { FeedVideo } from "@/components/feed/video-card";

export type PlaylistVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

export type PlaylistSummary = {
  id: string;
  title: string;
  visibility: PlaylistVisibility;
  itemCount: number;
  thumbnailUrl: string | null;
};

/** LIB-12: the viewer's playlists with an item count + a cover thumbnail. */
export async function getUserPlaylists(
  userId: string,
): Promise<PlaylistSummary[]> {
  const rows = await prisma.playlist.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      visibility: true,
      _count: { select: { items: true } },
      items: {
        orderBy: { position: "asc" },
        take: 1,
        select: { video: { select: { thumbnailUrl: true } } },
      },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    visibility: p.visibility,
    itemCount: p._count.items,
    thumbnailUrl: p.items[0]?.video.thumbnailUrl ?? null,
  }));
}

export type PickerPlaylist = {
  id: string;
  title: string;
  visibility: PlaylistVisibility;
  contains: boolean;
};

/** LIB-10: for the Save picker — the viewer's playlists + whether each holds this video. */
export async function getPlaylistsForPicker(
  userId: string,
  videoId: string,
): Promise<PickerPlaylist[]> {
  const rows = await prisma.playlist.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      visibility: true,
      items: { where: { videoId }, select: { id: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    visibility: p.visibility,
    contains: p.items.length > 0,
  }));
}

export type PlaylistDetail = {
  id: string;
  title: string;
  description: string | null;
  visibility: PlaylistVisibility;
  ownerId: string;
  ownerName: string;
  ownerHandle: string | null;
  videos: FeedVideo[];
  isOwner: boolean;
};

/** LIB-11: a playlist with its ordered videos; private playlists are owner-only. */
export async function getPlaylistDetail(
  playlistId: string,
  viewerId: string | null,
): Promise<PlaylistDetail | null> {
  const p = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      ownerId: true,
      owner: {
        select: { name: true, username: true, channel: { select: { handle: true } } },
      },
      items: {
        orderBy: { position: "asc" },
        select: {
          video: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              durationSeconds: true,
              viewCount: true,
              publishedAt: true,
              status: true,
              visibility: true,
              channel: {
                select: {
                  handle: true,
                  name: true,
                  avatarUrl: true,
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!p) return null;

  const isOwner = viewerId !== null && viewerId === p.ownerId;
  if (p.visibility === "PRIVATE" && !isOwner) return null;

  // Public/unlisted READY videos show to everyone; a PRIVATE video only shows
  // to the channel that owns it (so a creator still sees their own private
  // uploads in their playlist, but no one else's leak through).
  const videos: FeedVideo[] = p.items
    .map((i) => i.video)
    .filter(
      (v) =>
        v.status === "READY" &&
        (v.visibility !== "PRIVATE" || v.channel.userId === viewerId),
    )
    .map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      durationSeconds: v.durationSeconds,
      viewCount: v.viewCount,
      publishedAt: v.publishedAt,
      channel: {
        handle: v.channel.handle,
        name: v.channel.name,
        avatarUrl: v.channel.avatarUrl,
      },
    }));

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    visibility: p.visibility,
    ownerId: p.ownerId,
    ownerName: p.owner.name ?? p.owner.username,
    ownerHandle: p.owner.channel?.handle ?? null,
    videos,
    isOwner,
  };
}
