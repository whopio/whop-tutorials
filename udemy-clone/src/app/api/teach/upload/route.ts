import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMux } from "@/lib/mux";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { headers } from "next/headers";

const uploadSchema = z.object({ lessonId: z.string().min(1) });

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`teach:upload:${ip}`, { interval: 60_000, maxRequests: 10 });
  if (limited) return limited;

  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    include: { section: { include: { course: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const profile = await getCreatorProfile(user.id);
  if (!profile || lesson.section.course.creatorId !== profile.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const mux = getMux();

  if (lesson.muxAssetId) {
    try {
      await mux.video.assets.delete(lesson.muxAssetId);
    } catch {
      // continue
    }
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        muxAssetId: null,
        muxPlaybackId: null,
        muxUploadId: null,
        duration: null,
        videoReady: false,
      },
    });
  }

  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL!,
    new_asset_settings: {
      passthrough: lesson.id,
      playback_policy: ["signed"],
      video_quality: "basic",
    },
  });

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { muxUploadId: upload.id },
  });

  return NextResponse.json({ url: upload.url, uploadId: upload.id });
}
