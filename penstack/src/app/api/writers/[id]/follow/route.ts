import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/services/notification-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: writerId } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`follow:${user.id}`, {
    interval: 60_000,
    maxRequests: 30,
  });
  if (limited) return limited;

  const writer = await prisma.writer.findUnique({ where: { id: writerId } });
  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  const existingFollow = await prisma.follow.findUnique({
    where: { userId_writerId: { userId: user.id, writerId } },
  });

  if (existingFollow) {
    await prisma.follow.delete({ where: { id: existingFollow.id } });
  } else {
    await prisma.follow.create({ data: { userId: user.id, writerId } });
    // Notify writer of new follower
    createNotification(
      writer.userId,
      "NEW_FOLLOWER",
      "New follower",
      "Someone just followed your publication!",
      { writerId }
    ).catch(() => {});
  }

  const count = await prisma.follow.count({ where: { writerId } });

  return NextResponse.json({ following: !existingFollow, count });
}
