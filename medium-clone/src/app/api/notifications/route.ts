import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface NotificationItem {
  id: string;
  type: "LIKE" | "FOLLOWED" | "TIP_RECEIVED" | "PAYOUT_SENT" | "PLUS_RENEWED";
  read: boolean;
  createdAt: string;
  href: string | null;
  body: string;
}

export async function GET() {
  const user = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const storyIds = notifications.filter((n) => n.type === "LIKE").map((n) => n.entityId);
  const followerIds = notifications.filter((n) => n.type === "FOLLOWED").map((n) => n.entityId);
  const tipStoryIds = notifications
    .filter((n) => n.type === "TIP_RECEIVED")
    .map((n) => n.entityId);

  const [likeStories, followers, tipStories] = await Promise.all([
    storyIds.length
      ? prisma.story.findMany({
          where: { id: { in: storyIds } },
          select: { id: true, title: true, slug: true, author: { select: { username: true } } },
        })
      : Promise.resolve([]),
    followerIds.length
      ? prisma.user.findMany({
          where: { id: { in: followerIds } },
          select: { id: true, username: true, name: true },
        })
      : Promise.resolve([]),
    tipStoryIds.length
      ? prisma.story.findMany({
          where: { id: { in: tipStoryIds } },
          select: { id: true, title: true, slug: true, author: { select: { username: true } } },
        })
      : Promise.resolve([]),
  ]);

  const storyById = new Map(likeStories.map((s) => [s.id, s]));
  const followerById = new Map(followers.map((u) => [u.id, u]));
  const tipStoryById = new Map(tipStories.map((s) => [s.id, s]));

  const items: NotificationItem[] = notifications.map((n) => {
    let href: string | null = null;
    let body = "";
    switch (n.type) {
      case "LIKE": {
        const s = storyById.get(n.entityId);
        if (s) {
          body = `Someone liked your story "${s.title}".`;
          href = `/@${s.author.username}/${s.slug}`;
        } else {
          body = "Someone liked your story.";
        }
        break;
      }
      case "FOLLOWED": {
        const f = followerById.get(n.entityId);
        if (f) {
          body = `${f.name ?? `@${f.username}`} followed you.`;
          href = `/@${f.username}`;
        } else {
          body = "You have a new follower.";
        }
        break;
      }
      case "TIP_RECEIVED": {
        const s = tipStoryById.get(n.entityId);
        if (s) {
          body = `You received a tip on "${s.title}".`;
          href = "/me/dashboard";
        } else {
          body = "You received a tip.";
          href = "/me/dashboard";
        }
        break;
      }
      case "PAYOUT_SENT":
        body = "Your monthly Partner Program payout was sent.";
        href = "/me/dashboard";
        break;
      case "PLUS_RENEWED":
        body = "Your subscription renewed.";
        href = "/me/membership";
        break;
    }
    return {
      id: n.id,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      href,
      body,
    };
  });

  const unread = items.filter((i) => !i.read).length;
  return NextResponse.json({ items, unread });
}
