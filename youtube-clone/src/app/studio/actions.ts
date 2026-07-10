"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notifyNewUpload } from "@/lib/notifications";
import {
  createVideoSchema,
  updateVideoSchema,
  type CreateVideoInput,
} from "@/lib/validators";

export type CreateVideoResult = { id?: string; error?: string };
export type UpdateVideoResult = { ok?: boolean; error?: string };

/** Confirm the signed-in user owns the channel that holds this video. */
async function ownedVideo(videoId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      videoUrl: true,
      thumbnailUrl: true,
      publishedAt: true,
      channel: { select: { userId: true, membershipsEnabled: true } },
    },
  });
  if (!video || video.channel.userId !== user.id) return null;
  return video;
}

/**
 * VIDEO-2/3/5: persist a Video row after the browser finishes uploading to
 * Vercel Blob. Because Blob does no transcoding, the video is immediately
 * playable, so we land it directly in READY (no UPLOADING→PROCESSING→READY
 * webhook dance that Mux would require).
 */
export async function createVideo(
  input: CreateVideoInput,
): Promise<CreateVideoResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true, membershipsEnabled: true },
  });
  if (!channel) return { error: "Create a channel first." };

  const parsed = createVideoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid video data." };
  }
  const d = parsed.data;

  const video = await prisma.video.create({
    data: {
      channelId: channel.id,
      title: d.title,
      description: d.description ? d.description : null,
      visibility: d.visibility,
      category: d.category,
      status: "READY",
      videoUrl: d.videoUrl,
      videoPathname: d.videoPathname,
      thumbnailUrl: d.thumbnailUrl ?? null,
      durationSeconds: Math.round(d.durationSeconds),
      // Members-only only takes effect if the channel actually has memberships.
      membersOnly: d.membersOnly && channel.membershipsEnabled,
      isShort: d.isShort,
      publishedAt: d.visibility === "PRIVATE" ? null : new Date(),
    },
    select: { id: true },
  });

  // NOTIFY-10: tell subscribers (with the bell on) about a new public upload.
  // Awaited so it completes before the serverless function freezes, but its
  // errors are isolated — a notification hiccup must never fail the upload.
  if (d.visibility === "PUBLIC") {
    try {
      await notifyNewUpload(channel.id, channel.name, {
        id: video.id,
        title: d.title,
      });
    } catch {
      // best-effort fan-out
    }
  }

  revalidatePath("/");
  revalidatePath("/waves");
  revalidatePath("/studio/videos");
  return { id: video.id };
}

/** VIDEO-7: edit an existing video's metadata (owner-only, Zod-validated). */
export async function updateVideo(
  _prev: UpdateVideoResult,
  formData: FormData,
): Promise<UpdateVideoResult> {
  const parsed = updateVideoSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    visibility: formData.get("visibility"),
    category: formData.get("category"),
    membersOnly: formData.get("membersOnly") === "on",
    isShort: formData.get("isShort") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const owned = await ownedVideo(parsed.data.id);
  if (!owned) return { error: "Video not found." };

  await prisma.video.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ? parsed.data.description : null,
      visibility: parsed.data.visibility,
      category: parsed.data.category,
      membersOnly: parsed.data.membersOnly && owned.channel.membershipsEnabled,
      isShort: parsed.data.isShort,
      // Only (un)publish on a real visibility transition — never re-promote a
      // long-published video to the top of the feed just because its metadata
      // was edited. PRIVATE → null; first time made visible → now; else keep.
      publishedAt:
        parsed.data.visibility === "PRIVATE"
          ? null
          : owned.publishedAt
            ? undefined
            : new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/waves");
  revalidatePath("/studio/videos");
  revalidatePath("/watch");
  return { ok: true };
}

/**
 * VIDEO-8: delete a video (owner-only). Removes the DB row and the backing
 * Blob assets. Demo videos point at external sample URLs, so we only call the
 * Blob delete API for URLs that actually live in our blob store.
 */
export async function deleteVideo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const owned = await ownedVideo(id);
  if (!owned) return;

  const blobUrls = [owned.videoUrl, owned.thumbnailUrl].filter(
    (u): u is string => !!u && u.includes(".blob.vercel-storage.com"),
  );
  if (blobUrls.length > 0) {
    try {
      await del(blobUrls);
    } catch {
      // Asset already gone / network hiccup — proceed with the row delete.
    }
  }

  await prisma.video.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/studio/videos");
  redirect("/studio/videos");
}
