import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();

  const story = await prisma.story.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!story || story.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Story not available" }, { status: 404 });
  }

  const existing = await prisma.bookmark.findUnique({
    where: { userId_storyId: { userId: user.id, storyId: id } },
    select: { id: true },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  }

  await prisma.bookmark.create({ data: { userId: user.id, storyId: id } });
  return NextResponse.json({ bookmarked: true });
}
