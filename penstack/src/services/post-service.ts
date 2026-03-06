import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { POSTS_PER_PAGE } from "@/constants/config";
import { notifyFollowers } from "@/services/notification-service";
import type { PostVisibility } from "@/generated/prisma/client";

export async function getPostBySlug(writerHandle: string, slug: string) {
  const post = await prisma.post.findFirst({
    where: {
      slug,
      writer: { handle: writerHandle },
      published: true,
    },
    include: {
      writer: {
        include: {
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
      _count: { select: { likes: true } },
    },
  });

  if (!post) return null;

  // Increment view count in the background — fire and forget
  prisma.post
    .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return post;
}

export async function getPostsByWriter(
  writerId: string,
  opts: { published?: boolean; cursor?: string; limit?: number } = {}
) {
  const { published, cursor, limit = POSTS_PER_PAGE } = opts;

  const posts = await prisma.post.findMany({
    where: {
      writerId,
      ...(published !== undefined ? { published } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { likes: true } },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}

export async function createPost(
  writerId: string,
  data: {
    title: string;
    subtitle?: string;
    content: unknown;
    coverImageUrl?: string;
    visibility?: PostVisibility;
    paywallIndex?: number;
    published?: boolean;
  }
) {
  const baseSlug = slugify(data.title);
  const slug = await ensureUniqueSlug(writerId, baseSlug);

  return prisma.post.create({
    data: {
      writerId,
      slug,
      title: data.title,
      subtitle: data.subtitle,
      content: data.content as object,
      coverImageUrl: data.coverImageUrl,
      visibility: data.visibility,
      paywallIndex: data.paywallIndex,
      published: data.published ?? false,
      publishedAt: data.published ? new Date() : null,
    },
  });
}

export async function updatePost(
  postId: string,
  writerId: string,
  data: {
    title?: string;
    subtitle?: string;
    content?: unknown;
    coverImageUrl?: string;
    visibility?: PostVisibility;
    paywallIndex?: number;
    published?: boolean;
  }
) {
  const existing = await prisma.post.findFirst({
    where: { id: postId, writerId },
  });
  if (!existing) throw new Error("Post not found");

  let slug = existing.slug;
  if (data.title && data.title !== existing.title) {
    slug = await ensureUniqueSlug(writerId, slugify(data.title), postId);
  }

  const isNewlyPublished =
    data.published === true && !existing.published;

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      ...data,
      content: data.content as object | undefined,
      slug,
      publishedAt: isNewlyPublished ? new Date() : existing.publishedAt,
    },
    include: { writer: true },
  });

  if (isNewlyPublished) {
    notifyFollowers(
      writerId,
      "NEW_POST",
      `New post from ${post.writer.name}`,
      post.title,
      { postId: post.id, writerId }
    ).catch(() => {});
  }

  return post;
}

export async function deletePost(postId: string, writerId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, writerId },
  });
  if (!post) throw new Error("Post not found");

  return prisma.post.delete({ where: { id: postId } });
}

export async function toggleLike(userId: string, postId: string) {
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return { liked: false };
  }

  await prisma.like.create({ data: { userId, postId } });
  return { liked: true };
}

export async function getLikeCount(postId: string) {
  return prisma.like.count({ where: { postId } });
}

export async function isLikedByUser(userId: string, postId: string) {
  const like = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  return !!like;
}

// ── Helpers ─────────────────────────────────────────────

async function ensureUniqueSlug(
  writerId: string,
  baseSlug: string,
  excludePostId?: string
) {
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const conflict = await prisma.post.findFirst({
      where: {
        writerId,
        slug,
        ...(excludePostId ? { id: { not: excludePostId } } : {}),
      },
    });
    if (!conflict) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
}
