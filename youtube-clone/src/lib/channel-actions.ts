"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./session";
import { updateChannelSchema, type UpdateChannelInput } from "./validators";

export type UpdateChannelResult =
  | { ok: true; handle: string }
  | { error: string };

/**
 * CHANNEL-6/7: update the signed-in user's channel profile — name, @handle,
 * description, avatar, banner. Owner-scoped (one channel per user); the @handle
 * must stay globally unique.
 */
export async function updateChannel(
  input: UpdateChannelInput,
): Promise<UpdateChannelResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: { id: true, handle: true },
  });
  if (!channel) return { error: "Create a channel first." };

  const parsed = updateChannelSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  if (d.handle !== channel.handle) {
    const taken = await prisma.channel.findUnique({
      where: { handle: d.handle },
      select: { id: true },
    });
    if (taken) return { error: "That handle is already taken." };
  }

  try {
    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        name: d.name,
        description: d.description ? d.description : null,
        handle: d.handle,
        avatarUrl: d.avatarUrl ? d.avatarUrl : null,
        bannerUrl: d.bannerUrl ? d.bannerUrl : null,
      },
    });
  } catch (e) {
    // Lost the race on the @unique handle between our check and this write.
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

  // The handle changes the public URL, so revalidate both old and new.
  revalidatePath(`/@${channel.handle}`);
  revalidatePath(`/@${d.handle}`);
  revalidatePath("/studio/customize");
  return { ok: true, handle: d.handle };
}
