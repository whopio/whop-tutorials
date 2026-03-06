import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getWriterProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/posts/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const limited = rateLimit(`post:get:${id}`, {
    interval: 60_000,
    maxRequests: 60,
  });
  if (limited) return limited;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      writer: {
        select: { id: true, handle: true, name: true, avatarUrl: true },
      },
      _count: { select: { likes: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Increment view count
  await prisma.post.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json(post);
}

// PATCH /api/posts/[id]
const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(400).optional(),
  content: z.unknown().optional(),
  visibility: z.enum(["FREE", "PAID", "PREVIEW"]).optional(),
  paywallIndex: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
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

  const limited = rateLimit(`post:update:${user.id}`, {
    interval: 60_000,
    maxRequests: 20,
  });
  if (limited) return limited;

  const writer = await getWriterProfile(user.id);
  if (!writer) {
    return NextResponse.json({ error: "Not a writer" }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.writerId !== writer.id) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
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

  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // If publishing for the first time, set publishedAt
  const updateData: Record<string, unknown> = { ...data };
  if (data.content !== undefined) {
    updateData.content = data.content as object;
  }
  if (data.published === true && !post.publishedAt) {
    updateData.publishedAt = new Date();
  }

  const updated = await prisma.post.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE /api/posts/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const writer = await getWriterProfile(user.id);
  if (!writer) {
    return NextResponse.json({ error: "Not a writer" }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.writerId !== writer.id) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
