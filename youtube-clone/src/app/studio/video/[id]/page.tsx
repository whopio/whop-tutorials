import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { EditVideoForm } from "./edit-form";

export const metadata = { title: "Edit video - Wavora Studio" };

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      category: true,
      membersOnly: true,
      isShort: true,
      channel: { select: { userId: true } },
    },
  });
  if (!video || video.channel.userId !== user.id) notFound();

  return (
    <div>
      <Link
        href="/studio/videos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to content
      </Link>
      <h1 className="mb-8 text-2xl font-bold">Video details</h1>
      <EditVideoForm
        video={{
          id: video.id,
          title: video.title,
          description: video.description,
          visibility: video.visibility,
          category: video.category,
          membersOnly: video.membersOnly,
          isShort: video.isShort,
        }}
      />
    </div>
  );
}
