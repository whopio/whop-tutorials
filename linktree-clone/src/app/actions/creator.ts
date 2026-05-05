"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { ACCENTS, type AccentKey } from "@/lib/theme";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProfileSchema = z.object({
  handle: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "Only lowercase letters, numbers, - and _"),
  title: z.string().max(80),
  bio: z.string().max(300),
  unlockPrice: z.coerce.number().min(1).max(1000), // dollars, $1 to $1000
});

const ACCENT_KEYS = ACCENTS.map((a) => a.key) as [AccentKey, ...AccentKey[]];
const AccentSchema = z.enum(ACCENT_KEYS);

export type ActionResult = { error?: string; success?: boolean };

export async function saveProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const raw = {
    handle: formData.get("handle"),
    title: formData.get("title"),
    bio: formData.get("bio"),
    unlockPrice: formData.get("unlockPrice"),
  };

  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { handle, title, bio, unlockPrice: unlockPriceDollars } = parsed.data;
  const unlockPrice = Math.round(unlockPriceDollars * 100); // convert to cents

  // Check handle uniqueness (excluding current creator)
  const existing = await prisma.creator.findUnique({ where: { handle } });
  const myCreator = await prisma.creator.findUnique({ where: { userId } });

  if (existing && existing.userId !== userId) {
    return { error: "Handle is already taken" };
  }

  if (myCreator) {
    await prisma.creator.update({
      where: { userId },
      data: { handle, title, bio, unlockPrice },
    });
  } else {
    await prisma.creator.create({
      data: { userId, handle, title, bio, unlockPrice },
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setAccent(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const parsed = AccentSchema.safeParse(formData.get("accent"));
  if (!parsed.success) return { error: "Invalid accent color" };

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) return { error: "Save your profile first" };

  await prisma.creator.update({
    where: { userId },
    data: { accentColor: parsed.data },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
