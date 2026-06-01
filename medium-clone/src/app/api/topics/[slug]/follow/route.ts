import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await requireAuth();

  const topic = await prisma.topic.findUnique({ where: { slug }, select: { id: true } });
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const existing = await prisma.topicFollow.findUnique({
    where: { userId_topicId: { userId: user.id, topicId: topic.id } },
    select: { userId: true },
  });

  if (existing) {
    await prisma.topicFollow.delete({
      where: { userId_topicId: { userId: user.id, topicId: topic.id } },
    });
    return NextResponse.json({ following: false });
  }

  await prisma.topicFollow.create({
    data: { userId: user.id, topicId: topic.id },
  });
  return NextResponse.json({ following: true });
}
