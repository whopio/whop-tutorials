"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const ANON_COOKIE = "wv_anon";
const DAY_MS = 86_400_000;

/**
 * WATCH-3: count at most one view per viewer per video per day. We dedupe on a
 * View row keyed by (videoId, sessionKey); the denormalized Video.viewCount is
 * only bumped when a fresh View row is actually inserted.
 */
export async function recordView(videoId: string): Promise<void> {
  if (!videoId) return;

  const user = await getCurrentUser();
  let who: string;
  if (user) {
    who = `u:${user.id}`;
  } else {
    const jar = await cookies();
    let anon = jar.get(ANON_COOKIE)?.value;
    if (!anon) {
      anon = crypto.randomUUID();
      jar.set(ANON_COOKIE, anon, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
      });
    }
    who = `a:${anon}`;
  }

  const dayBucket = Math.floor(Date.now() / DAY_MS);
  const sessionKey = `${who}:${dayBucket}`;

  try {
    await prisma.view.create({
      data: { videoId, userId: user?.id ?? null, sessionKey },
    });
    // Only reached when the View insert succeeded (i.e. first time today).
    await prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // Unique (videoId, sessionKey) violation → already counted this viewer
    // today, or the video was removed. Either way, nothing to do.
  }
}
