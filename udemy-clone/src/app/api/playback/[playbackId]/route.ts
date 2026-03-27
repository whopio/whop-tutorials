import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signPlaybackId } from "@/lib/mux";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playbackId: string }> }
) {
  const { playbackId } = await params;

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`playback:${ip}`, { interval: 60_000, maxRequests: 30 });
  if (limited) return limited;

  const lesson = await prisma.lesson.findFirst({
    where: { muxPlaybackId: playbackId },
    include: { section: { include: { course: true } } },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (lesson.isFree) {
    const token = await signPlaybackId(playbackId);
    return NextResponse.json({ token });
  }

  const user = await requireAuth({ redirect: false });
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: lesson.section.course.id,
      },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const token = await signPlaybackId(playbackId);
  return NextResponse.json({ token });
}
