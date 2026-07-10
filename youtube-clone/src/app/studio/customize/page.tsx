import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CustomizeForm } from "./customize-form";

export const metadata = { title: "Customize channel - Wavora Studio" };

/** CHANNEL-6/7: the channel-profile editor (owner-only). */
export default async function CustomizePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: {
      name: true,
      handle: true,
      description: true,
      avatarUrl: true,
      bannerUrl: true,
    },
  });
  if (!channel) redirect("/create-channel");

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">Customize channel</h1>
      <CustomizeForm
        channel={{
          name: channel.name,
          handle: channel.handle,
          description: channel.description ?? "",
          avatarUrl: channel.avatarUrl ?? "",
          bannerUrl: channel.bannerUrl ?? "",
        }}
      />
    </div>
  );
}
