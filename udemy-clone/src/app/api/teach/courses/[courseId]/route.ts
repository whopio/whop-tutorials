import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMux } from "@/lib/mux";
import { z } from "zod";
import { MAX_COURSE_TITLE, MAX_COURSE_DESCRIPTION } from "@/lib/constants";

const updateCourseSchema = z
  .object({
    title: z.string().min(3).max(MAX_COURSE_TITLE),
    description: z.string().min(10).max(MAX_COURSE_DESCRIPTION),
    price: z.number().int().min(0),
    category: z.enum([
      "DEVELOPMENT", "BUSINESS", "DESIGN", "MARKETING",
      "PHOTOGRAPHY", "MUSIC", "HEALTH", "LIFESTYLE",
      "DATA_SCIENCE", "ARTIFICIAL_INTELLIGENCE", "CYBERSECURITY", "CLOUD_COMPUTING",
      "MOBILE_DEVELOPMENT", "GAME_DEVELOPMENT", "FINANCE", "ENTREPRENEURSHIP",
      "PROJECT_MANAGEMENT", "PERSONAL_DEVELOPMENT", "WRITING", "VIDEO_PRODUCTION",
      "ANIMATION", "ARCHITECTURE", "ENGINEERING", "SCIENCE",
      "MATHEMATICS", "LANGUAGE", "COOKING", "FITNESS",
      "PARENTING", "TEACHING",
    ]),
    thumbnailUrl: z.string().url().optional().or(z.literal("")),
  })
  .partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCreatorProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Not an instructor" }, { status: 403 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.creatorId !== profile.id) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...parsed.data,
      thumbnailUrl: parsed.data.thumbnailUrl === "" ? null : parsed.data.thumbnailUrl,
    },
  });

  return NextResponse.json({ course: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCreatorProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Not an instructor" }, { status: 403 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: { lessons: true },
      },
    },
  });
  if (!course || course.creatorId !== profile.id) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Clean up Mux assets
  const mux = getMux();
  for (const section of course.sections) {
    for (const lesson of section.lessons) {
      if (lesson.muxAssetId) {
        try {
          await mux.video.assets.delete(lesson.muxAssetId);
        } catch {
          // Asset may already be deleted
        }
      }
    }
  }

  // Cascade delete handles sections, lessons, enrollments, progress, reviews
  await prisma.course.delete({ where: { id: courseId } });

  return NextResponse.json({ success: true });
}
