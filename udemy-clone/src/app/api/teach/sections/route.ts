import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { MAX_SECTION_TITLE, MAX_SECTIONS_PER_COURSE } from "@/lib/constants";

async function verifyCourseOwnership(userId: string, courseId: string) {
  const profile = await getCreatorProfile(userId);
  if (!profile) return null;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.creatorId !== profile.id) return null;
  return course;
}

const createSchema = z.object({
  title: z.string().min(1).max(MAX_SECTION_TITLE),
  courseId: z.string().min(1),
});

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(MAX_SECTION_TITLE).optional(),
  order: z.number().int().min(0).optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const course = await verifyCourseOwnership(user.id, parsed.data.courseId);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const count = await prisma.section.count({ where: { courseId: course.id } });
  if (count >= MAX_SECTIONS_PER_COURSE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_SECTIONS_PER_COURSE} sections per course` },
      { status: 400 }
    );
  }

  const section = await prisma.section.create({
    data: { title: parsed.data.title, courseId: course.id, order: count },
  });

  return NextResponse.json({ section }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const section = await prisma.section.findUnique({
    where: { id: parsed.data.id },
  });
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const course = await verifyCourseOwnership(user.id, section.courseId);
  if (!course) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const updated = await prisma.section.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.order !== undefined && { order: parsed.data.order }),
    },
  });

  return NextResponse.json({ section: updated });
}

export async function DELETE(request: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const section = await prisma.section.findUnique({
    where: { id: parsed.data.id },
  });
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const course = await verifyCourseOwnership(user.id, section.courseId);
  if (!course) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await prisma.section.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ success: true });
}
