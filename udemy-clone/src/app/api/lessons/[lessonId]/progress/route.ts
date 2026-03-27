import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { course: true } } },
  });

  if (!lesson)
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

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

  const progress = await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: {
      userId: user.id,
      lessonId,
      completed: true,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ progress });
}
