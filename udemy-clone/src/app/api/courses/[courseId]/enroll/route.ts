import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`enroll:${ip}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  const user = await requireAuth({ redirect: false });
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (course.price > 0) {
    return NextResponse.json(
      { error: "This course requires payment" },
      { status: 400 }
    );
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
  }

  await prisma.enrollment.create({
    data: { userId: user.id, courseId },
  });

  return NextResponse.json({ success: true });
}
