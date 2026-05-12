"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type SongFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

export async function uploadSong(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Create a profile first" };

  const title = formData.get("title")?.toString() ?? "";
  const description = formData.get("description")?.toString() ?? "";
  const priceStr = formData.get("price")?.toString() ?? "1.99";
  const isPremium = formData.get("isFree") !== "on";
  const audioUrl = formData.get("audioUrl")?.toString() ?? "";
  const coverUrl = formData.get("coverUrl")?.toString() || null;

  const schema = z.object({
    title: z.string().min(1, "Title required").max(100, "Title max 100 chars"),
    price: z
      .number()
      .min(0.99, "Minimum price $0.99")
      .max(50, "Maximum price $50"),
  });

  const priceNum = parseFloat(priceStr);
  const result = schema.safeParse({ title, price: priceNum });
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  if (!audioUrl) {
    return { errors: { audioFile: ["Audio file required"] } };
  }

  try {
    await prisma.song.create({
      data: {
        artistId: artist.id,
        title,
        description: description || null,
        audioUrl,
        coverUrl,
        previewUrl: null,
        duration: 0,
        isPremium,
        price: Math.round(result.data.price * 100),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function deleteSong(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const songId = formData.get("songId")?.toString();
  if (!songId) return { message: "Missing song ID" };

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Artist not found" };

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.artistId !== artist.id) return { message: "Not authorized" };

  await prisma.song.delete({ where: { id: songId } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function togglePremium(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const songId = formData.get("songId")?.toString();
  if (!songId) return { message: "Missing song ID" };

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Artist not found" };

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.artistId !== artist.id) return { message: "Not authorized" };

  await prisma.song.update({
    where: { id: songId },
    data: { isPremium: !song.isPremium },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSongPrice(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const songId = formData.get("songId")?.toString();
  const priceStr = formData.get("price")?.toString() ?? "";
  const priceNum = parseFloat(priceStr);

  if (!songId) return { message: "Missing song ID" };
  if (isNaN(priceNum) || priceNum < 0.99 || priceNum > 50) {
    return { errors: { price: ["Price must be between $0.99 and $50.00"] } };
  }

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Artist not found" };

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.artistId !== artist.id) return { message: "Not authorized" };

  await prisma.song.update({
    where: { id: songId },
    data: { price: Math.round(priceNum * 100) },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
