import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h — collapse repeated LIKE notifications per story

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();

  const story = await prisma.story.findUnique({
    where: { id },
    select: { id: true, authorUserId: true, status: true },
  });
  if (!story || story.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Story not available" }, { status: 404 });
  }

  const existing = await prisma.like.findUnique({
    where: { userId_storyId: { userId: user.id, storyId: id } },
    select: { id: true },
  });

  const liked = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.like.delete({ where: { id: existing.id } });
      await tx.story.update({
        where: { id },
        data: { likesTotal: { decrement: 1 } },
      });
      return false;
    }
    await tx.like.create({ data: { userId: user.id, storyId: id } });
    await tx.story.update({
      where: { id },
      data: { likesTotal: { increment: 1 } },
    });
    return true;
  });

  // Notification fire-and-forget. Author doesn't get one when liking own story,
  // and we collapse duplicates if there's already an unread LIKE for this story in the last 24h.
  if (liked && story.authorUserId !== user.id) {
    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const recent = await prisma.notification.findFirst({
      where: {
        userId: story.authorUserId,
        type: "LIKE",
        entityId: story.id,
        read: false,
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });
    if (!recent) {
      await prisma.notification.create({
        data: {
          userId: story.authorUserId,
          type: "LIKE",
          entityId: story.id,
        },
      });
    }
  }

  // Return the updated count so the client can reconcile if the optimistic state drifted.
  const fresh = await prisma.story.findUnique({
    where: { id },
    select: { likesTotal: true },
  });

  return NextResponse.json({ liked, likesTotal: fresh?.likesTotal ?? 0 });
}
