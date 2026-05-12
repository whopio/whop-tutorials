"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function createPlaylist(name: string, songId?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return { error: "Name required" as const };

  const playlist = await prisma.userPlaylist.create({
    data: {
      userId,
      name: trimmed,
      ...(songId
        ? { songs: { create: { songId, position: 0 } } }
        : {}),
    },
  });

  revalidatePath("/library");
  return { playlist: { id: playlist.id, name: playlist.name } };
}

export async function addSongToPlaylist(playlistId: string, songId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const playlist = await prisma.userPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return { error: "Not authorized" as const };

  const agg = await prisma.userPlaylistSong.aggregate({
    where: { playlistId },
    _max: { position: true },
  });
  const position = (agg._max.position ?? -1) + 1;

  await prisma.userPlaylistSong.upsert({
    where: { playlistId_songId: { playlistId, songId } },
    update: {},
    create: { playlistId, songId, position },
  });

  revalidatePath("/library");
  return { success: true as const };
}

export async function removeSongFromPlaylist(playlistId: string, songId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const playlist = await prisma.userPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return { error: "Not authorized" as const };

  await prisma.userPlaylistSong.deleteMany({ where: { playlistId, songId } });

  revalidatePath("/library");
  return { success: true as const };
}

export async function deletePlaylist(playlistId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const playlist = await prisma.userPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return { error: "Not authorized" as const };

  await prisma.userPlaylist.delete({ where: { id: playlistId } });

  revalidatePath("/library");
  return { success: true as const };
}
