import { prisma } from "@/lib/prisma";
import { NotificationsMenu } from "@/components/NotificationsMenu";

/**
 * Server component: counts unread notifications, hands the initial count
 * to the dropdown client component.
 */
export async function NotificationBell({ userId }: { userId: string }) {
  const unread = await prisma.notification.count({
    where: { userId, read: false },
  });
  return <NotificationsMenu initialUnread={unread} />;
}
