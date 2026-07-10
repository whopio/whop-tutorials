import "server-only";
import { prisma } from "./prisma";

/**
 * SOCIAL-2: a channel's subscriber count plus whether the given viewer is
 * subscribed — the single aggregate consumed by the channel header (CHANNEL-5)
 * and the watch-page channel row (WATCH-4).
 */
export async function getChannelSocial(channelId: string, userId?: string) {
  const [subscriberCount, mine] = await Promise.all([
    prisma.subscription.count({ where: { channelId } }),
    userId
      ? prisma.subscription.findUnique({
          where: { subscriberId_channelId: { subscriberId: userId, channelId } },
          select: { notify: true },
        })
      : Promise.resolve(null),
  ]);
  return {
    subscriberCount,
    isSubscribed: Boolean(mine),
    notifyLevel: mine?.notify ?? null,
  };
}

/**
 * SOCIAL-3/4: the public like count for a video plus the viewer's own reaction
 * (LIKE / DISLIKE / null). The dislike count is intentionally NOT returned here
 * — it's private to the creator (SOCIAL-5).
 */
export async function getVideoReactions(videoId: string, userId?: string) {
  const [likeCount, mine] = await Promise.all([
    prisma.reaction.count({ where: { videoId, type: "LIKE" } }),
    userId
      ? prisma.reaction.findUnique({
          where: { userId_videoId: { userId, videoId } },
          select: { type: true },
        })
      : Promise.resolve(null),
  ]);
  return { likeCount, myReaction: mine?.type ?? null };
}
