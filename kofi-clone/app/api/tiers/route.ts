import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(60),
  priceCents: z.number().int().min(1).max(1_000_000),
  description: z.string().max(500).optional(),
  benefits: z.array(z.string().min(1).max(120)).max(20).default([]),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`tiers:${clientIp(req)}`, 20, 60_000)) {
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
  const { name, priceCents, description, benefits } = parsed.data;

  const count = await prisma.tier.count({ where: { creatorId: creator.id } });

  const tier = await prisma.tier.create({
    data: {
      creatorId: creator.id,
      name,
      priceCents,
      description: description?.trim() || null,
      benefits: benefits.map((b) => b.trim()).filter(Boolean),
      order: count,
    },
  });

  return NextResponse.json({ ok: true, id: tier.id });
}
