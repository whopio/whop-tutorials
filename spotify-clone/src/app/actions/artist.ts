"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  handle: z
    .string()
    .min(2, "Handle must be at least 2 characters")
    .max(32, "Handle must be at most 32 characters")
    .regex(/^[a-z0-9_-]+$/, "Handle must be lowercase alphanumeric, dash, or underscore"),
  displayName: z.string().min(1, "Display name required").max(80, "Display name max 80 characters"),
  bio: z.string().max(300, "Bio max 300 characters").optional(),
});

export type ProfileFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

export async function saveProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const raw = {
    handle: formData.get("handle")?.toString().toLowerCase() ?? "",
    displayName: formData.get("displayName")?.toString() ?? "",
    bio: formData.get("bio")?.toString() ?? "",
  };

  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { handle, displayName, bio } = result.data;

  // Check handle uniqueness (allow own artist to keep same handle)
  const existing = await prisma.artist.findUnique({ where: { handle } });
  const currentArtist = await prisma.artist.findUnique({ where: { userId } });
  if (existing && existing.userId !== userId) {
    return { errors: { handle: ["Handle already taken"] } };
  }

  await prisma.artist.upsert({
    where: { userId },
    update: { handle, displayName, bio: bio || null },
    create: { userId, handle, displayName, bio: bio || null },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
