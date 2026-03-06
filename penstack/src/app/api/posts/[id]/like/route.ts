import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`like:${user.id}`, {
    interval: 60_000,
    maxRequests: 30,
  });
  if (limited) return limited;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Toggle like
  const existingLike = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existingLike) {
    await prisma.like.delete({ where: { id: existingLike.id } });
  } else {
    await prisma.like.create({
      data: { userId: user.id, postId },
    });
  }

  const count = await prisma.like.count({ where: { postId } });

  return NextResponse.json({ liked: !existingLike, count });
}
