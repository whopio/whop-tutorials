import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getCurrentUser } from "./session";

/** Return the signed-in user or redirect to the sign-in surface (AUTH-9). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** The current user's channel, or null if they haven't created one yet. */
export async function getMyChannel() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.channel.findUnique({ where: { userId: user.id } });
}

/**
 * Require a signed-in user who owns a channel. Redirects to sign-in if logged
 * out, or to the create-channel flow if they have no channel yet. Used to gate
 * the studio + upload (CHANNEL-8 / VIDEO ownership).
 */
export async function requireChannel() {
  const user = await requireUser();
  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
  });
  if (!channel) redirect("/create-channel");
  return { user, channel };
}
