import "server-only";
import { prisma } from "./prisma";

/**
 * NOTIFY-10: alert subscribers who haven't muted the bell about a new upload
 * with an in-app notification. For the demo we fan out inline; at scale this
 * would move to a background queue.
 */
export async function notifyNewUpload(
  channelId: string,
  channelName: string,
  video: { id: string; title: string },
): Promise<void> {
  const subs = await prisma.subscription.findMany({
    where: { channelId, notify: { not: "NONE" } },
    select: { subscriberId: true },
  });
  if (subs.length === 0) return;

  await prisma.notification.createMany({
    data: subs.map((s) => ({
      recipientId: s.subscriberId,
      type: "NEW_UPLOAD" as const,
      title: `${channelName} posted a new video`,
      body: video.title,
      data: { videoId: video.id, channelId },
    })),
  });
}

/** NOTIFY-5: a viewer's notifications, newest first. */
export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });
}

/** NOTIFY-6: the unread-count for the bell badge. */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientId: userId, readAt: null },
  });
}
