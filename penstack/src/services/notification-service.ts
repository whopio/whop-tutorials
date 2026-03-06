import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  refs?: { postId?: string; writerId?: string }
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      postId: refs?.postId,
      writerId: refs?.writerId,
    },
  });
}

export async function getNotifications(
  userId: string,
  cursor?: string,
  limit = 20
) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function notifyFollowers(
  writerId: string,
  type: NotificationType,
  title: string,
  message: string,
  refs?: { postId?: string; writerId?: string }
) {
  const followers = await prisma.follow.findMany({
    where: { writerId },
    select: { userId: true },
  });

  if (followers.length === 0) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.userId,
      type,
      title,
      message,
      postId: refs?.postId,
      writerId: refs?.writerId,
    })),
  });
}
