import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ username: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!rateLimit(`follow:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const creator = await prisma.creator.findUnique({
    where: { username: parsed.data.username },
    select: { id: true },
  });
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.follow.findUnique({
    where: { creatorId_userId: { creatorId: creator.id, userId: user.id } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }
  await prisma.follow.create({ data: { creatorId: creator.id, userId: user.id } });
  return NextResponse.json({ following: true });
}
