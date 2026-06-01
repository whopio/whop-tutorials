import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const user = await requireAuth();

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.id === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerUserId_followedUserId: {
        followerUserId: user.id,
        followedUserId: target.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({
    data: { followerUserId: user.id, followedUserId: target.id },
  });

  await prisma.notification.create({
    data: { userId: target.id, type: "FOLLOWED", entityId: user.id },
  });

  return NextResponse.json({ following: true });
}
