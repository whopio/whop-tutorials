import { cache } from "react";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";

/** Cached lightweight creator lookup, deduped across layout + page in one request. */
export const getCreatorLite = cache(async (username: string) => {
  return prisma.creator.findUnique({
    where: { username },
    select: {
      id: true,
      userId: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      coverImageUrl: true,
      accentColor: true,
      isActive: true,
    },
  });
});

export interface ViewerContext {
  userId: string | null;
  isOwner: boolean;
  isSupporter: boolean;
  activeTierIds: string[];
  isFollowing: boolean;
}

/** Determine the current viewer's relationship to a creator (for gating + UI). */
export async function getViewerContext(creatorId: string, creatorUserId?: string): Promise<ViewerContext> {
  const user = await getCurrentUser();
  if (!user) {
    return { userId: null, isOwner: false, isSupporter: false, activeTierIds: [], isFollowing: false };
  }

  const [memberships, follow] = await Promise.all([
    prisma.membership.findMany({
      where: { creatorId, userId: user.id, status: { in: ["ACTIVE", "CANCELING"] } },
      select: { tierId: true },
    }),
    prisma.follow.findUnique({
      where: { creatorId_userId: { creatorId, userId: user.id } },
      select: { id: true },
    }),
  ]);

  return {
    userId: user.id,
    isOwner: creatorUserId ? user.id === creatorUserId : Boolean(user.creator && user.creator.id === creatorId),
    isSupporter: memberships.length > 0,
    activeTierIds: memberships.map((m) => m.tierId),
    isFollowing: Boolean(follow),
  };
}

/** Whether a viewer can see a post's full content. */
export function canViewPost(
  post: { visibility: "PUBLIC" | "SUPPORTERS" | "TIER"; minimumTierId: string | null },
  viewer: ViewerContext,
): boolean {
  if (post.visibility === "PUBLIC") return true;
  if (viewer.isOwner) return true;
  if (post.visibility === "SUPPORTERS") return viewer.isSupporter;
  if (post.visibility === "TIER") {
    return post.minimumTierId ? viewer.activeTierIds.includes(post.minimumTierId) : viewer.isSupporter;
  }
  return false;
}
