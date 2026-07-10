"use server";

import { prisma } from "./prisma";
import { getCurrentUser } from "./session";
import { commentBodySchema } from "./validators";
import {
  getCommentsData,
  getReplies,
  toCommentDTO,
  type CommentDTO,
} from "./comments";

function prismaCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e
    ? (e as { code?: string }).code
    : undefined;
}

/** A viewer may see or write comments only on a video they can watch, with
 * comments turned on. Private videos are the owner's alone. */
async function canReadComments(
  videoId: string,
  userId?: string,
): Promise<boolean> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      commentsEnabled: true,
      visibility: true,
      channel: { select: { userId: true } },
    },
  });
  if (!video || !video.commentsEnabled) return false;
  return video.visibility !== "PRIVATE" || video.channel.userId === userId;
}

/** Confirm the signed-in user is the creator (channel owner) for a comment. */
async function assertCommentOwner(commentId: string, userId: string) {
  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      isPinned: true,
      heartedByCreator: true,
      videoId: true,
      parentId: true,
      video: { select: { channel: { select: { userId: true } } } },
    },
  });
  if (!c || c.video.channel.userId !== userId) return null;
  return c;
}

/** SOCIAL-6/7: post a top-level comment or a one-level-deep reply. */
export async function postComment(
  videoId: string,
  body: string,
  parentId?: string,
): Promise<{ comment: CommentDTO } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const parsed = commentBodySchema.safeParse(body);
  if (!parsed.success) return { error: "invalid" };

  if (!(await canReadComments(videoId, user.id))) return { error: "disabled" };

  // Normalize replies to one level deep: replying to a reply attaches to its
  // top-level parent (SOCIAL-7). Only a still-published thread can be
  // replied to; a removed thread never renders, so its count must not grow.
  let normalizedParent: string | null = null;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true, videoId: true, status: true },
    });
    if (!parent || parent.videoId !== videoId || parent.status !== "PUBLISHED") {
      return { error: "bad_parent" };
    }
    normalizedParent = parent.parentId ?? parent.id;
  }

  const created = await prisma.comment.create({
    data: {
      videoId,
      authorId: user.id,
      parentId: normalizedParent,
      body: parsed.data,
      status: "PUBLISHED",
    },
    include: {
      author: {
        select: { id: true, name: true, username: true, avatarUrl: true },
      },
      _count: { select: { reactions: true } },
      reactions: { where: { userId: user.id }, select: { id: true } },
    },
  });

  return { comment: toCommentDTO(created, user.id, 0) };
}

/** SOCIAL-11: the author deletes their own comment (cascades replies/reactions). */
export async function deleteComment(
  commentId: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });
  if (!c) return { ok: true };
  if (c.authorId !== user.id) return { error: "forbidden" };
  await prisma.comment.delete({ where: { id: commentId } });
  return { ok: true };
}

/** SOCIAL-9: like / unlike a comment (public count). */
export async function toggleCommentLike(
  commentId: string,
): Promise<{ liked: boolean; count: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  const existing = await prisma.commentReaction.findUnique({
    where: { userId_commentId: { userId: user.id, commentId } },
    select: { id: true },
  });
  if (existing) {
    try {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
    } catch (e) {
      // P2025: a concurrent click already removed it.
      if (prismaCode(e) !== "P2025") throw e;
    }
  } else {
    try {
      await prisma.commentReaction.create({
        data: { userId: user.id, commentId },
      });
    } catch (e) {
      // P2002: a concurrent click already liked it. P2003: the comment was
      // deleted from under us.
      const code = prismaCode(e);
      if (code === "P2003") return { error: "not_found" };
      if (code !== "P2002") throw e;
    }
  }
  const count = await prisma.commentReaction.count({ where: { commentId } });
  return { liked: !existing, count };
}

/** SOCIAL-9: the creator hearts (or un-hearts) a comment. */
export async function heartComment(
  commentId: string,
): Promise<{ hearted: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  const c = await assertCommentOwner(commentId, user.id);
  if (!c) return { error: "forbidden" };
  await prisma.comment.update({
    where: { id: commentId },
    data: { heartedByCreator: !c.heartedByCreator },
  });
  return { hearted: !c.heartedByCreator };
}

/** SOCIAL-10: the creator pins exactly one comment per video (toggle). */
export async function pinComment(
  commentId: string,
): Promise<{ pinned: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  const c = await assertCommentOwner(commentId, user.id);
  if (!c) return { error: "forbidden" };

  if (c.isPinned) {
    await prisma.comment.update({
      where: { id: commentId },
      data: { isPinned: false },
    });
    return { pinned: false };
  }
  await prisma.$transaction([
    prisma.comment.updateMany({
      where: { videoId: c.videoId, isPinned: true },
      data: { isPinned: false },
    }),
    prisma.comment.update({
      where: { id: commentId },
      data: { isPinned: true },
    }),
  ]);
  return { pinned: true };
}

/** SOCIAL-11: the creator removes (hides) or restores a comment. */
export async function moderateComment(
  commentId: string,
  action: "remove" | "restore",
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  const c = await assertCommentOwner(commentId, user.id);
  if (!c) return { error: "forbidden" };

  const status = action === "remove" ? "REMOVED" : "PUBLISHED";
  await prisma.$transaction([
    prisma.comment.update({ where: { id: commentId }, data: { status } }),
    // A top-level comment carries its whole thread, so its replies move with it
    // (otherwise an orphaned reply would still count but never render).
    ...(c.parentId === null
      ? [
          prisma.comment.updateMany({
            where: { parentId: commentId },
            data: { status },
          }),
        ]
      : []),
  ]);
  return { ok: true };
}

/** SOCIAL-12: the creator turns comments on/off for a video. */
export async function toggleComments(
  videoId: string,
  enabled: boolean,
): Promise<{ enabled: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };
  const v = await prisma.video.findUnique({
    where: { id: videoId },
    select: { channel: { select: { userId: true } } },
  });
  if (!v || v.channel.userId !== user.id) return { error: "forbidden" };
  await prisma.video.update({
    where: { id: videoId },
    data: { commentsEnabled: enabled },
  });
  return { enabled };
}

/** SOCIAL-8: re-fetch the comment list under a new sort. */
export async function fetchComments(
  videoId: string,
  sort: "top" | "newest",
): Promise<CommentDTO[]> {
  const user = await getCurrentUser();
  if (!(await canReadComments(videoId, user?.id))) return [];
  const data = await getCommentsData(videoId, user?.id, sort);
  return data?.comments ?? [];
}

/** SOCIAL-7: lazy-load the replies under a comment. */
export async function loadReplies(parentId: string): Promise<CommentDTO[]> {
  const user = await getCurrentUser();
  const parent = await prisma.comment.findUnique({
    where: { id: parentId },
    select: { videoId: true },
  });
  if (!parent || !(await canReadComments(parent.videoId, user?.id))) return [];
  return getReplies(parentId, user?.id);
}
