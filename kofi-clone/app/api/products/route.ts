import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  priceCents: z.number().int().min(0).max(10_000_000),
  imageUrl: z.string().url().max(2000).optional(),
  type: z.enum(["DIGITAL", "PHYSICAL"]),
  downloadUrl: z.string().url().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`products:${clientIp(req)}`, 20, 60_000)) {
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
  const { title, description, priceCents, imageUrl, type, downloadUrl } = parsed.data;

  const product = await prisma.product.create({
    data: {
      creatorId: creator.id,
      title,
      description: description?.trim() || null,
      priceCents,
      imageUrl: imageUrl || null,
      type,
      downloadUrl: downloadUrl || null,
    },
  });

  return NextResponse.json({ ok: true, id: product.id });
}
