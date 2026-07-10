"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./session";

/**
 * LIB-1/2: record (or update) a watch-history entry with the current playback
 * position. Treated as finished at 95% (LIB-2). Skipped when history is paused
 * (LIB-5) or the viewer is signed out.
 */
export async function recordWatchProgress(
  videoId: string,
  positionSeconds: number,
  durationSeconds: number,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || typeof videoId !== "string" || videoId.length === 0) return;

  // Clamp client-reported values: the position/duration come straight from the
  // browser <video> element, so guard against NaN/Infinity/absurd numbers ever
  // reaching the Int columns (12h ceiling).
  if (!Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds)) return;
  const MAX_SECONDS = 12 * 60 * 60;
  const pos = Math.min(Math.max(0, Math.round(positionSeconds)), MAX_SECONDS);
  const dur = Math.min(Math.max(0, Math.round(durationSeconds)), MAX_SECONDS);

  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { historyPaused: true },
  });
  if (u?.historyPaused) return;

  const completed = dur > 0 && pos >= dur * 0.95;

  await prisma.watchHistory.upsert({
    where: { userId_videoId: { userId: user.id, videoId } },
    create: { userId: user.id, videoId, positionSeconds: pos, completed },
    update: { positionSeconds: pos, completed, lastWatchedAt: new Date() },
  });
}

/** LIB-6: clear all of the viewer's watch history (and resume positions). */
export async function clearHistory(): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  await prisma.watchHistory.deleteMany({ where: { userId: user.id } });
  revalidatePath("/feed/history");
  revalidatePath("/");
  return { ok: true };
}

/** LIB-5: pause or resume recording of watch history. */
export async function setHistoryPaused(
  paused: boolean,
): Promise<{ paused: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  await prisma.user.update({
    where: { id: user.id },
    data: { historyPaused: paused },
  });
  return { paused };
}
