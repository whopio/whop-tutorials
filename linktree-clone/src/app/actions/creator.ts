"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import {
  ACCENTS,
  BG_PRESETS,
  CARD_STYLES,
  isCardStyleKey,
  isHexColor,
  type AccentKey,
} from "@/lib/theme";
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
const BG_PRESET_KEYS = BG_PRESETS.map((b) => b.key);
const CARD_STYLE_KEYS = CARD_STYLES.map((s) => s.key);

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

  const raw = formData.get("accent");
  let value: string;
  if (typeof raw === "string" && ACCENT_KEYS.includes(raw as AccentKey)) {
    value = raw;
  } else if (isHexColor(raw)) {
    value = (raw as string).toLowerCase();
  } else {
    return { error: "Invalid accent color" };
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) return { error: "Save your profile first" };

  await prisma.creator.update({
    where: { userId },
    data: { accentColor: value },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setCardStyle(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const raw = formData.get("cardStyle");
  if (!isCardStyleKey(raw)) return { error: "Invalid card style" };

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) return { error: "Save your profile first" };

  await prisma.creator.update({
    where: { userId },
    data: { cardStyle: raw },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Background can come in three flavors:
//   1. kind="auto"     -> bgValue ignored, page background defaults are used
//   2. kind="preset"   -> bgValue must match a preset key from theme.ts
//   3. kind="solid"    -> bgValue must be a hex color
//   4. kind="gradient" -> bgValue must be a CSS gradient string built by the
//                         picker (validated against a permissive shape)
export async function setBackground(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const kind = formData.get("kind");
  const value = formData.get("value");

  let storedKind: string;
  let storedValue: string | null = null;

  if (kind === "auto") {
    storedKind = "auto";
    storedValue = null;
  } else if (kind === "preset") {
    if (typeof value !== "string" || !BG_PRESET_KEYS.includes(value)) {
      return { error: "Unknown background preset" };
    }
    storedKind = "preset";
    storedValue = value;
  } else if (kind === "solid") {
    if (!isHexColor(value)) return { error: "Invalid background color" };
    storedKind = "solid";
    storedValue = (value as string).toLowerCase();
  } else if (kind === "gradient") {
    if (
      typeof value !== "string" ||
      value.length > 500 ||
      !/^linear-gradient\(/.test(value)
    ) {
      return { error: "Invalid gradient" };
    }
    storedKind = "gradient";
    storedValue = value;
  } else {
    return { error: "Invalid background kind" };
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) return { error: "Save your profile first" };

  await prisma.creator.update({
    where: { userId },
    data: { bgKind: storedKind, bgValue: storedValue },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setTextColor(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const raw = formData.get("textColor");
  let value: string;
  if (raw === "auto") {
    value = "auto";
  } else if (isHexColor(raw)) {
    value = (raw as string).toLowerCase();
  } else {
    return { error: "Invalid text color" };
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) return { error: "Save your profile first" };

  await prisma.creator.update({
    where: { userId },
    data: { textColor: value },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Updates Creator.avatarUrl with a URL that was just uploaded to blob storage.
// The actual upload happens client-side via the Vercel Blob client API; this
// action just records the resulting URL on the creator row after basic
// validation.
export async function setAvatarUrl(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const raw = formData.get("avatarUrl");
  let avatarUrl: string | null = null;

  if (raw === "" || raw === null) {
    avatarUrl = null;
  } else if (
    typeof raw === "string" &&
    /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(raw)
  ) {
    avatarUrl = raw;
  } else {
    return { error: "Invalid avatar URL" };
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) return { error: "Save your profile first" };

  await prisma.creator.update({
    where: { userId },
    data: { avatarUrl },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
