import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  targetCents: z.number().int().min(100).max(10_000_000),
});

// Upsert the creator's single active donation goal.
export async function PATCH(req: NextRequest) {
  if (!rateLimit(`creator-goal:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { creator } = await requireCreator();

  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const data = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    targetCents: input.targetCents,
    isActive: true,
  };

  const existing = await prisma.goal.findFirst({
    where: { creatorId: creator.id, isActive: true },
  });
  if (existing) {
    await prisma.goal.update({ where: { id: existing.id }, data });
  } else {
    await prisma.goal.create({ data: { creatorId: creator.id, ...data } });
  }

  return NextResponse.json({ ok: true });
}

// Retire the creator's active goal.
export async function DELETE(req: NextRequest) {
  if (!rateLimit(`creator-goal:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { creator } = await requireCreator();
  await prisma.goal.updateMany({
    where: { creatorId: creator.id, isActive: true },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
