"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./prisma";
import { getCurrentUser } from "./session";

const VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;

function prismaCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e
    ? (e as { code?: string }).code
    : undefined;
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(150),
  visibility: z.enum(VISIBILITIES).default("PRIVATE"),
});

/** LIB-9: create a playlist owned by the viewer. */
export async function createPlaylist(input: {
  title: string;
  visibility?: (typeof VISIBILITIES)[number];
}): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a playlist name." };

  const playlist = await prisma.playlist.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      visibility: parsed.data.visibility,
    },
    select: { id: true },
  });
  revalidatePath("/feed/playlists");
  revalidatePath("/feed/you");
  return { id: playlist.id };
}

/**
 * LIB-10: add or remove a video from a playlist the viewer owns; appends to the
 * end when adding. Returns the resulting membership state for an optimistic UI.
 */
export async function togglePlaylistItem(
  playlistId: string,
  videoId: string,
): Promise<{ contains: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== user.id) return { error: "not_found" };

  const existing = await prisma.playlistItem.findUnique({
    where: { playlistId_videoId: { playlistId, videoId } },
    select: { id: true },
  });

  if (existing) {
    try {
      await prisma.playlistItem.delete({ where: { id: existing.id } });
    } catch (e) {
      // P2025: a concurrent click already removed it.
      if (prismaCode(e) !== "P2025") throw e;
    }
  } else {
    const last = await prisma.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    try {
      await prisma.playlistItem.create({
        data: { playlistId, videoId, position: (last?.position ?? -1) + 1 },
      });
    } catch (e) {
      // P2002: a concurrent click already added it. P2003: the video was
      // deleted from under us; nothing to add.
      const code = prismaCode(e);
      if (code === "P2003") return { error: "not_found" };
      if (code !== "P2002") throw e;
    }
  }
  // Bump the playlist so it sorts to the top of "recently updated".
  await prisma.playlist.update({
    where: { id: playlistId },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/playlist`);
  revalidatePath("/feed/playlists");
  revalidatePath("/feed/you");
  return { contains: !existing };
}

/** LIB-9/10: create a playlist and add a video to it in one step (Save picker). */
export async function createPlaylistWithVideo(
  title: string,
  visibility: (typeof VISIBILITIES)[number],
  videoId: string,
): Promise<{ id: string } | { error: string }> {
  const created = await createPlaylist({ title, visibility });
  if ("error" in created) return created;
  try {
    const res = await togglePlaylistItem(created.id, videoId);
    if ("error" in res) throw new Error(res.error);
  } catch (e) {
    // Compensate: don't leave an empty playlist the user never wanted.
    await prisma.playlist.delete({ where: { id: created.id } }).catch(() => {});
    return { error: e instanceof Error ? e.message : "failed" };
  }
  return { id: created.id };
}

/** LIB-11: remove a specific video from a playlist (playlist page control). */
export async function removeFromPlaylist(
  playlistId: string,
  videoId: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== user.id) return { error: "not_found" };

  await prisma.playlistItem.deleteMany({ where: { playlistId, videoId } });
  await prisma.playlist.update({
    where: { id: playlistId },
    data: { updatedAt: new Date() },
  });
  revalidatePath(`/playlist`);
  return { ok: true };
}

/** LIB-12: delete a playlist the viewer owns (items cascade). */
export async function deletePlaylist(
  playlistId: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== user.id) return { error: "not_found" };

  await prisma.playlist.delete({ where: { id: playlistId } });
  revalidatePath("/feed/playlists");
  revalidatePath("/feed/you");
  return { ok: true };
}
