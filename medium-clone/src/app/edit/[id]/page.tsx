import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { JSONContent } from "@tiptap/core";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StoryEditor } from "@/components/editor/StoryEditor";

export const metadata: Metadata = { title: "Edit story" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStoryPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  const [story, topics] = await Promise.all([
    prisma.story.findUnique({
      where: { id },
      include: { topics: { include: { topic: true } } },
    }),
    prisma.topic.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  if (!story || story.authorUserId !== user.id) notFound();

  return (
    <StoryEditor
      story={{
        id: story.id,
        title: story.title,
        subtitle: story.subtitle,
        contentJson: (story.contentJson as JSONContent) ?? { type: "doc", content: [] },
        coverImageUrl: story.coverImageUrl,
        status: story.status,
        topicSlugs: story.topics.map((t) => t.topic.slug),
      }}
      topicOptions={topics}
    />
  );
}
