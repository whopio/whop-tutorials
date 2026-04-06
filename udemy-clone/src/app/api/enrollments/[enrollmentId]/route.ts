import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const { enrollmentId } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment || enrollment.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete progress records for this enrollment's course
  await prisma.progress.deleteMany({
    where: {
      userId: user.id,
      lesson: { section: { courseId: enrollment.courseId } },
    },
  });

  // Delete the enrollment
  await prisma.enrollment.delete({ where: { id: enrollmentId } });

  return NextResponse.json({ success: true });
}
