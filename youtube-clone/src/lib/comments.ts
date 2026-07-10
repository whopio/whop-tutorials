import "server-only";
import { prisma } from "./prisma";
import { activeMemberIds } from "./membership";

/** Serialized comment shape sent to the client (Dates → ISO strings). */
export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  myLiked: boolean;
  heartedByCreator: boolean;
  isPinned: boolean;
  replyCount: number;
  isOwn: boolean;
  authorIsMember: boolean;
  isSuperThanks: boolean;
  superThanksAmount: number | null;
};

const authorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} as const;

/** Include the author, public like count, and the viewer's own like (if any). */
function commentInclude(currentUserId?: string) {
  return {
    author: { select: authorSelect },
    _count: { select: { reactions: true } },
    reactions: {
      where: { userId: currentUserId ?? "__no_user__" },
      select: { id: true },
    },
  };
}

type RawComment = {
  id: string;
  body: string;
  createdAt: Date;
  heartedByCreator: boolean;
  isPinned: boolean;
  isSuperThanks: boolean;
  superThanksAmount: number | null;
  author: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  _count: { reactions: number };
  reactions: { id: string }[];
};

export function toCommentDTO(
  c: RawComment,
  currentUserId: string | undefined,
  replyCount: number,
  authorIsMember = false,
): CommentDTO {
  return {
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    author: c.author,
    likeCount: c._count.reactions,
    myLiked: c.reactions.length > 0,
    heartedByCreator: c.heartedByCreator,
    isPinned: c.isPinned,
    replyCount,
    isOwn: Boolean(currentUserId) && c.author.id === currentUserId,
    authorIsMember,
    isSuperThanks: c.isSuperThanks,
    superThanksAmount: c.superThanksAmount,
  };
}

/**
 * SOCIAL-6/7/8: top-level comments for a video. Pinned first (SOCIAL-10), then
 * by Top (engagement — like count) or Newest (recency). Reply counts (SOCIAL-7)
 * are computed in one grouped query so held/removed replies don't inflate them.
 */
export async function getCommentsData(
  videoId: string,
  currentUserId: string | undefined,
  sort: "top" | "newest",
) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      commentsEnabled: true,
      channelId: true,
      channel: { select: { userId: true } },
    },
  });
  if (!video) return null;

  const isCreator =
    Boolean(currentUserId) && currentUserId === video.channel.userId;

  const [count, rows] = await Promise.all([
    prisma.comment.count({ where: { videoId, status: "PUBLISHED" } }),
    prisma.comment.findMany({
      where: { videoId, parentId: null, status: "PUBLISHED" },
      orderBy:
        sort === "top"
          ? [
              { isPinned: "desc" },
              { reactions: { _count: "desc" } },
              { createdAt: "desc" },
            ]
          : [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: commentInclude(currentUserId),
    }),
  ]);

  const ids = rows.map((r) => r.id);
  const replyGroups = ids.length
    ? await prisma.comment.groupBy({
        by: ["parentId"],
        where: { parentId: { in: ids }, status: "PUBLISHED" },
        _count: { _all: true },
      })
    : [];
  const replyCounts = new Map(
    replyGroups.map((g) => [g.parentId as string, g._count._all]),
  );

  const members = await activeMemberIds(
    video.channelId,
    rows.map((r) => r.author.id),
  );

  return {
    enabled: video.commentsEnabled,
    isCreator,
    count,
    comments: rows.map((r) =>
      toCommentDTO(
        r,
        currentUserId,
        replyCounts.get(r.id) ?? 0,
        members.has(r.author.id),
      ),
    ),
  };
}

/** SOCIAL-7: the published replies under one top-level comment, oldest first. */
export async function getReplies(
  parentId: string,
  currentUserId: string | undefined,
): Promise<CommentDTO[]> {
  const [parent, rows] = await Promise.all([
    prisma.comment.findUnique({
      where: { id: parentId },
      select: { video: { select: { channelId: true } } },
    }),
    prisma.comment.findMany({
      where: { parentId, status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: commentInclude(currentUserId),
    }),
  ]);
  const members = parent
    ? await activeMemberIds(
        parent.video.channelId,
        rows.map((r) => r.author.id),
      )
    : new Set<string>();
  return rows.map((r) =>
    toCommentDTO(r, currentUserId, 0, members.has(r.author.id)),
  );
}
