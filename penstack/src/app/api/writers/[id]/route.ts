import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/writers/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const limited = rateLimit(`writer:get:${id}`, {
    interval: 60_000,
    maxRequests: 60,
  });
  if (limited) return limited;

  const writer = await prisma.writer.findUnique({
    where: { id },
    include: {
      user: {
        select: { displayName: true, avatarUrl: true },
      },
      _count: {
        select: {
          posts: { where: { published: true } },
          followers: true,
          subscriptions: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  return NextResponse.json(writer);
}

// PATCH /api/writers/[id]
const updateWriterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  category: z
    .enum([
      "TECHNOLOGY",
      "BUSINESS",
      "CULTURE",
      "POLITICS",
      "SCIENCE",
      "HEALTH",
      "FINANCE",
      "SPORTS",
      "FOOD",
      "TRAVEL",
      "MUSIC",
      "ART",
      "EDUCATION",
      "OTHER",
    ])
    .optional(),
  monthlyPriceInCents: z.number().int().min(100).max(100_000).optional(),
  chatPublic: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`writer:update:${user.id}`, {
    interval: 60_000,
    maxRequests: 20,
  });
  if (limited) return limited;

  const writer = await prisma.writer.findUnique({ where: { id } });
  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }
  if (writer.userId !== user.id) {
    return NextResponse.json(
      { error: "Not your publication" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = updateWriterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updated = await prisma.writer.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
