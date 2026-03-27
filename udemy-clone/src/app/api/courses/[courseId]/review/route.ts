import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { MAX_REVIEW_COMMENT } from "@/lib/constants";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(MAX_REVIEW_COMMENT).optional().or(z.literal("")),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (!enrollment) {
    return NextResponse.json(
      { error: "Must be enrolled to review" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const review = await prisma.review.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
    create: {
      userId: user.id,
      courseId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });

  return NextResponse.json({ review });
}
