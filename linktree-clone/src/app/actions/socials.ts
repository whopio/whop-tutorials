"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { isSocialPlatformKey } from "@/lib/socials";
import { isHexColor } from "@/lib/theme";
import { revalidatePath } from "next/cache";

type ActionResult = { error?: string; success?: boolean };

async function getCreatorForUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.creator.findUnique({ where: { userId } });
}

export async function addSocialLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Save your profile first" };

  const platform = formData.get("platform");
  const url = formData.get("url");

  if (!isSocialPlatformKey(platform)) {
    return { error: "Pick a platform from the list" };
  }
  if (typeof url !== "string" || url.trim().length === 0) {
    return { error: "Enter a URL" };
  }

  // For email, we accept a bare address; for everything else require https.
  let normalized = url.trim();
  if (platform === "email") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized.replace(/^mailto:/, ""))) {
      return { error: "Enter a valid email address" };
    }
  } else if (!/^https?:\/\//.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  const count = await prisma.socialLink.count({
    where: { creatorId: creator.id },
  });

  await prisma.socialLink.create({
    data: {
      creatorId: creator.id,
      platform,
      url: normalized,
      sortOrder: count,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSocialLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "Missing id" };

  const social = await prisma.socialLink.findUnique({ where: { id } });
  if (!social || social.creatorId !== creator.id) {
    return { error: "Not found" };
  }

  await prisma.socialLink.delete({ where: { id } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setSocialColor(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const id = formData.get("id");
  const color = formData.get("color");

  if (typeof id !== "string") return { error: "Missing id" };

  const social = await prisma.socialLink.findUnique({ where: { id } });
  if (!social || social.creatorId !== creator.id) {
    return { error: "Not found" };
  }

  let storedColor: string | null = null;
  if (color === "" || color === null) {
    storedColor = null;
  } else if (isHexColor(color)) {
    storedColor = (color as string).toLowerCase();
  } else {
    return { error: "Invalid color" };
  }

  await prisma.socialLink.update({
    where: { id },
    data: { color: storedColor },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function reorderSocialLinks(
  orderedIds: string[]
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const owned = await prisma.socialLink.findMany({
    where: { creatorId: creator.id, id: { in: orderedIds } },
    select: { id: true },
  });
  if (owned.length !== orderedIds.length) {
    return { error: "One or more socials could not be found" };
  }

  await prisma.$transaction(
    orderedIds.map((id, sortOrder) =>
      prisma.socialLink.update({ where: { id }, data: { sortOrder } })
    )
  );

  revalidatePath("/dashboard");
  return { success: true };
}
