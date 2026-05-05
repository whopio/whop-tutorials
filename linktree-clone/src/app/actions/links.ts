"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const LinkSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url("Must be a valid URL"),
  isPremium: z.coerce.boolean(),
});

type ActionResult = { error?: string; success?: boolean };

async function getCreatorForUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.creator.findUnique({ where: { userId } });
}

export async function addLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "No creator profile found" };

  const parsed = LinkSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    isPremium: formData.get("isPremium") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const count = await prisma.link.count({ where: { creatorId: creator.id } });

  await prisma.link.create({
    data: {
      creatorId: creator.id,
      title: parsed.data.title,
      url: parsed.data.url,
      isPremium: parsed.data.isPremium,
      sortOrder: count,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const linkId = formData.get("linkId") as string;
  const link = await prisma.link.findUnique({ where: { id: linkId } });

  if (!link || link.creatorId !== creator.id) {
    return { error: "Link not found" };
  }

  await prisma.link.delete({ where: { id: linkId } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function togglePremium(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const linkId = formData.get("linkId") as string;
  const link = await prisma.link.findUnique({ where: { id: linkId } });

  if (!link || link.creatorId !== creator.id) {
    return { error: "Link not found" };
  }

  await prisma.link.update({
    where: { id: linkId },
    data: { isPremium: !link.isPremium },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleVisibility(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const linkId = formData.get("linkId") as string;
  const link = await prisma.link.findUnique({ where: { id: linkId } });

  if (!link || link.creatorId !== creator.id) {
    return { error: "Link not found" };
  }

  await prisma.link.update({
    where: { id: linkId },
    data: { isVisible: !link.isVisible },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Reorder a creator's links by their new positional order. Accepts an array
// of link IDs (in the desired display order) and rewrites every sortOrder
// in a single transaction. Bulk write avoids N round trips.
export async function reorderLinks(orderedIds: string[]): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  // Validate every ID belongs to this creator before touching the DB.
  const owned = await prisma.link.findMany({
    where: { creatorId: creator.id, id: { in: orderedIds } },
    select: { id: true },
  });
  if (owned.length !== orderedIds.length) {
    return { error: "One or more links could not be found" };
  }

  await prisma.$transaction(
    orderedIds.map((id, sortOrder) =>
      prisma.link.update({ where: { id }, data: { sortOrder } })
    )
  );

  revalidatePath("/dashboard");
  return { success: true };
}
