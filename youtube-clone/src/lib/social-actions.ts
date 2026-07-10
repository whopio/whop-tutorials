"use server";

import { prisma } from "./prisma";
import { getCurrentUser } from "./session";
import type { NotifyLevel } from "@/generated/prisma/client";

/** The Prisma error code, for spotting the lost side of a concurrent toggle
 * (P2002 create, P2025 delete/update). */
function prismaCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e
    ? (e as { code?: string }).code
    : undefined;
}

export type SubscribeResult =
  | { subscribed: boolean; count: number }
  | { error: "sign_in" | "own_channel" };

/**
 * SOCIAL-1: toggle a free subscription to a channel. Idempotent via the
 * (subscriberId, channelId) unique constraint; you can't subscribe to your own
 * channel.
 */
export async function toggleSubscribe(
  channelId: string,
): Promise<SubscribeResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { userId: true },
  });
  if (!channel) return { error: "sign_in" };
  if (channel.userId === user.id) return { error: "own_channel" };

  const existing = await prisma.subscription.findUnique({
    where: {
      subscriberId_channelId: { subscriberId: user.id, channelId },
    },
    select: { id: true },
  });

  if (existing) {
    try {
      await prisma.subscription.delete({ where: { id: existing.id } });
    } catch (e) {
      // A concurrent click already removed it.
      if (prismaCode(e) !== "P2025") throw e;
    }
  } else {
    try {
      await prisma.subscription.create({
        data: { subscriberId: user.id, channelId },
      });
    } catch (e) {
      // A concurrent click already created it — treat as subscribed.
      if (prismaCode(e) !== "P2002") throw e;
    }
  }

  const count = await prisma.subscription.count({ where: { channelId } });
  return { subscribed: !existing, count };
}

/**
 * NOTIFY-1/2: set the per-subscription bell level (ALL / PERSONALIZED / NONE).
 * Only affects an existing subscription.
 */
export async function setNotifyLevel(
  channelId: string,
  level: NotifyLevel,
): Promise<{ ok: true } | { error: "sign_in" | "not_subscribed" }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const res = await prisma.subscription.updateMany({
    where: { subscriberId: user.id, channelId },
    data: { notify: level },
  });
  if (res.count === 0) return { error: "not_subscribed" };
  return { ok: true };
}

export type ReactionResult =
  | { reaction: "LIKE" | "DISLIKE" | null; likeCount: number }
  | { error: "sign_in" };

/**
 * SOCIAL-3/4: toggle a like or dislike on a video. A second click on the same
 * type clears it; the opposite type replaces it (mutually exclusive, one row
 * per user+video).
 */
export async function toggleReaction(
  videoId: string,
  type: "LIKE" | "DISLIKE",
): Promise<ReactionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const existing = await prisma.reaction.findUnique({
    where: { userId_videoId: { userId: user.id, videoId } },
  });

  try {
    if (existing?.type === type) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
    } else {
      try {
        await prisma.reaction.create({ data: { userId: user.id, videoId, type } });
      } catch (e) {
        // A concurrent click created the row first — update it to this type.
        if (prismaCode(e) !== "P2002") throw e;
        await prisma.reaction.update({
          where: { userId_videoId: { userId: user.id, videoId } },
          data: { type },
        });
      }
    }
  } catch (e) {
    // A concurrent click deleted the row mid-toggle; the count below is
    // still fresh, so just fall through.
    if (prismaCode(e) !== "P2025") throw e;
  }

  const likeCount = await prisma.reaction.count({
    where: { videoId, type: "LIKE" },
  });
  const reaction = existing?.type === type ? null : type;
  return { reaction, likeCount };
}
