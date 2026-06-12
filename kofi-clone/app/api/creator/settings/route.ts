import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAccentName } from "@/lib/accent";

// An uploaded image is either a hosted URL (Whop's CDN in production) or a data
// URL (sandbox, where Whop's Files API does not finish processing the file).
const imageValue = z.union([
  z.string().url().max(2000),
  z.string().regex(/^data:image\/(png|jpeg|webp|gif);base64,/).max(3_000_000),
  z.literal(""),
]);

const schema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(1000).optional(),
  coverImageUrl: imageValue.optional(),
  avatarUrl: imageValue.optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  accentColor: z.string().refine(isAccentName, "Invalid accent color").optional(),
});

export async function PATCH(req: NextRequest) {
  if (!rateLimit(`creator-settings:${clientIp(req)}`, 20, 60_000)) {
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

  const data: Prisma.CreatorUpdateInput = {};
  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.bio !== undefined) data.bio = input.bio.trim() || null;
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl || null;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl || null;
  if (input.tags !== undefined) data.tags = input.tags.map((t) => t.trim()).filter(Boolean);
  if (input.accentColor !== undefined) data.accentColor = input.accentColor;

  await prisma.creator.update({ where: { id: creator.id }, data });

  return NextResponse.json({ ok: true });
}
