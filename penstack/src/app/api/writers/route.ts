import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const createWriterSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Handle must be lowercase alphanumeric with optional hyphens"
    ),
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  category: z.enum([
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
  ]),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`writers:create:${user.id}`, {
    interval: 60_000,
    maxRequests: 5,
  });
  if (limited) return limited;

  // Check if user is already a writer
  const existingWriter = await prisma.writer.findUnique({
    where: { userId: user.id },
  });
  if (existingWriter) {
    return NextResponse.json(
      { error: "You already have a publication" },
      { status: 409 }
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

  const parsed = createWriterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { handle, name, bio, category, avatarUrl, bannerUrl } = parsed.data;

  // Check handle uniqueness
  const handleTaken = await prisma.writer.findUnique({ where: { handle } });
  if (handleTaken) {
    return NextResponse.json(
      { error: "Handle is already taken" },
      { status: 409 }
    );
  }

  const writer = await prisma.writer.create({
    data: {
      userId: user.id,
      handle,
      name,
      bio,
      category,
      avatarUrl,
      bannerUrl,
    },
  });

  return NextResponse.json(writer, { status: 201 });
}
