"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createChannelSchema } from "@/lib/validators";

export type CreateChannelState = { error?: string };

/**
 * CHANNEL-1 / CHANNEL-2: create the signed-in user's channel (one per user)
 * with a unique, validated @handle.
 *
 * NOTE: enrolling the channel as a Whop *connected account* (companies.create
 * under our platform company) is deferred to Phase 4 / PAYOUTS-1, where it is
 * first exercised. `Channel.whopCompanyId` stays null until then.
 */
export async function createChannel(
  _prev: CreateChannelState,
  formData: FormData,
): Promise<CreateChannelState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };

  const parsed = createChannelSchema.safeParse({
    name: formData.get("name"),
    handle: formData.get("handle"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // One channel per user.
  const existing = await prisma.channel.findUnique({
    where: { userId: user.id },
  });
  if (existing) redirect("/studio/videos");

  const taken = await prisma.channel.findUnique({
    where: { handle: parsed.data.handle },
  });
  if (taken) return { error: "That handle is already taken." };

  try {
    await prisma.channel.create({
      data: {
        userId: user.id,
        handle: parsed.data.handle,
        name: parsed.data.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (e) {
    // Lost the handle-uniqueness race between our check and this write.
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "That handle is already taken." };
    }
    throw e;
  }

  redirect("/studio/videos");
}
