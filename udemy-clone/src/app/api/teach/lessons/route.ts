import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMux } from "@/lib/mux";
import { z } from "zod";
import { MAX_LESSON_TITLE, MAX_LESSONS_PER_SECTION } from "@/lib/constants";

async function verifyLessonOwnership(userId: string, sectionId: string) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: true },
  });
  if (!section) return null;
  const profile = await getCreatorProfile(userId);
  if (!profile || section.course.creatorId !== profile.id) return null;
  return section;
}

const createSchema = z.object({
  title: z.string().min(1).max(MAX_LESSON_TITLE),
  sectionId: z.string().min(1),
  isFree: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(MAX_LESSON_TITLE).optional(),
  order: z.number().int().min(0).optional(),
  isFree: z.boolean().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const section = await verifyLessonOwnership(user.id, parsed.data.sectionId);
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const count = await prisma.lesson.count({ where: { sectionId: section.id } });
  if (count >= MAX_LESSONS_PER_SECTION) {
    return NextResponse.json(
      { error: `Maximum ${MAX_LESSONS_PER_SECTION} lessons per section` },
      { status: 400 }
    );
  }

  const lesson = await prisma.lesson.create({
    data: {
      title: parsed.data.title,
      sectionId: section.id,
      order: count,
      isFree: parsed.data.isFree ?? false,
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.id },
    include: { section: { include: { course: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const profile = await getCreatorProfile(user.id);
  if (!profile || lesson.section.course.creatorId !== profile.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const updated = await prisma.lesson.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.order !== undefined && { order: parsed.data.order }),
      ...(parsed.data.isFree !== undefined && { isFree: parsed.data.isFree }),
    },
  });

  return NextResponse.json({ lesson: updated });
}

export async function DELETE(request: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.id },
    include: { section: { include: { course: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const profile = await getCreatorProfile(user.id);
  if (!profile || lesson.section.course.creatorId !== profile.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (lesson.muxAssetId) {
    try {
      const mux = getMux();
      await mux.video.assets.delete(lesson.muxAssetId);
    } catch {
      // Asset may already be deleted
    }
  }

  await prisma.lesson.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ success: true });
}
