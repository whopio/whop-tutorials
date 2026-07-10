"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./session";

function prismaCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e
    ? (e as { code?: string }).code
    : undefined;
}

/** WATCH-12b / LIB-7: add or remove a video from the viewer's Watch later. */
export async function toggleWatchLater(
  videoId: string,
): Promise<{ saved: boolean } | { error: "sign_in" }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const existing = await prisma.watchLater.findUnique({
    where: { userId_videoId: { userId: user.id, videoId } },
    select: { id: true },
  });
  if (existing) {
    try {
      await prisma.watchLater.delete({ where: { id: existing.id } });
    } catch (e) {
      // P2025: a concurrent click already removed it.
      if (prismaCode(e) !== "P2025") throw e;
    }
  } else {
    try {
      await prisma.watchLater.create({ data: { userId: user.id, videoId } });
    } catch (e) {
      // P2002: a concurrent click already saved it. P2003: the video was
      // deleted from under us; nothing to save.
      const code = prismaCode(e);
      if (code === "P2003") return { saved: false };
      if (code !== "P2002") throw e;
    }
  }

  revalidatePath("/playlist");
  return { saved: !existing };
}
