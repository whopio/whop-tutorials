import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CreateChannelForm } from "./create-channel-form";

export const metadata = { title: "Create channel - Wavora" };

export default async function CreateChannelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
  });
  if (channel) redirect("/studio/videos");

  return (
    <CreateChannelForm
      defaultName={user.name ?? user.username}
      defaultHandle={user.username}
      avatarUrl={user.avatarUrl}
    />
  );
}
