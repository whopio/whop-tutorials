import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/notifications — paginated
export async function GET(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`notifications:${user.id}`, {
    interval: 60_000,
    maxRequests: 30,
  });
  if (limited) return limited;

  const cursor = request.nextUrl.searchParams.get("cursor");
  const limit = 20;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = notifications.length > limit;
  const results = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({
    notifications: results,
    nextCursor,
    unreadCount,
  });
}

// PATCH /api/notifications — mark as read
const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`notifications:read:${user.id}`, {
    interval: 60_000,
    maxRequests: 30,
  });
  if (limited) return limited;

  let notificationIds: string[] | undefined;
  try {
    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    notificationIds = parsed.data.notificationIds;
  } catch {
    // No body = mark all as read
  }

  if (notificationIds && notificationIds.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId: user.id },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
