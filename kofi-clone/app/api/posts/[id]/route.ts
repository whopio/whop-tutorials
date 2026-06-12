import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!rateLimit(`posts-del:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { creator } = await requireCreator();
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, creatorId: true },
  });
  if (!post || post.creatorId !== creator.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id: post.id } });

  return NextResponse.json({ ok: true });
}
