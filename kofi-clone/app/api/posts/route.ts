import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z
  .object({
    title: z.string().min(1).max(140),
    content: z.string().min(1).max(10000),
    imageUrl: z.string().url().max(2000).optional(),
    visibility: z.enum(["PUBLIC", "SUPPORTERS", "TIER"]),
    minimumTierId: z.string().min(1).optional(),
    pinned: z.boolean().optional().default(false),
  })
  .refine((data) => data.visibility !== "TIER" || Boolean(data.minimumTierId), {
    message: "Pick a tier for tier-gated posts",
    path: ["minimumTierId"],
  });

export async function POST(req: NextRequest) {
  if (!rateLimit(`posts:${clientIp(req)}`, 20, 60_000)) {
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
  const { title, content, imageUrl, visibility, minimumTierId, pinned } = parsed.data;

  // Tier-gated posts must reference a tier that belongs to this creator.
  let resolvedTierId: string | null = null;
  if (visibility === "TIER") {
    const tier = await prisma.tier.findFirst({
      where: { id: minimumTierId, creatorId: creator.id },
      select: { id: true },
    });
    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }
    resolvedTierId = tier.id;
  }

  const post = await prisma.post.create({
    data: {
      creatorId: creator.id,
      title,
      content,
      imageUrl: imageUrl || null,
      visibility,
      minimumTierId: resolvedTierId,
      pinned,
    },
  });

  return NextResponse.json({ ok: true, id: post.id });
}
