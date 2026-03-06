import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getWriterProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { POSTS_PER_PAGE } from "@/constants/config";
import type { PublicationCategory } from "@/generated/prisma/client";

// GET /api/posts — list posts
export async function GET(request: NextRequest) {
  const limited = rateLimit("posts:list", {
    interval: 60_000,
    maxRequests: 60,
  });
  if (limited) return limited;

  const { searchParams } = request.nextUrl;
  const writerId = searchParams.get("writerId");
  const cursor = searchParams.get("cursor");
  const category = searchParams.get("category");

  const posts = await prisma.post.findMany({
    where: {
      ...(writerId ? { writerId } : {}),
      ...(category ? { writer: { category: category as PublicationCategory } } : {}),
      published: true,
    },
    orderBy: { publishedAt: "desc" },
    take: POSTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      writer: {
        select: { id: true, handle: true, name: true, avatarUrl: true },
      },
      _count: { select: { likes: true } },
    },
  });

  const hasMore = posts.length > POSTS_PER_PAGE;
  const results = hasMore ? posts.slice(0, POSTS_PER_PAGE) : posts;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return NextResponse.json({
    posts: results,
    nextCursor,
  });
}

// POST /api/posts — create post
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(400).optional(),
  content: z.unknown(),
  visibility: z.enum(["FREE", "PAID", "PREVIEW"]),
  paywallIndex: z.number().int().min(0).optional(),
  published: z.boolean(),
  coverImageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`posts:create:${user.id}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  const writer = await getWriterProfile(user.id);
  if (!writer) {
    return NextResponse.json(
      { error: "You must be a writer to create posts" },
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

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { title, subtitle, content, visibility, paywallIndex, published, coverImageUrl } =
    parsed.data;

  // Generate slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const post = await prisma.post.create({
    data: {
      writerId: writer.id,
      title,
      subtitle,
      content: content as object,
      visibility,
      paywallIndex,
      published,
      publishedAt: published ? new Date() : null,
      coverImageUrl,
      slug,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
