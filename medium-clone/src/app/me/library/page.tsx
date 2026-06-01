import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StoryCard } from "@/components/StoryCard";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await requireAuth();

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      story: {
        include: {
          author: { select: { username: true, name: true } },
          topics: { include: { topic: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-sans font-bold text-[28px] sm:text-[32px] text-text-primary mb-2">
        Your library
      </h1>
      <p className="text-text-secondary mb-8">
        {bookmarks.length} {bookmarks.length === 1 ? "story" : "stories"} saved for later.
      </p>

      {bookmarks.length === 0 ? (
        <div className="py-16 text-center text-text-secondary">
          You haven&apos;t saved any stories yet.
        </div>
      ) : (
        <div className="border-t border-border">
          {bookmarks.map(({ story }) => (
            <StoryCard
              key={story.id}
              story={{
                id: story.id,
                slug: story.slug,
                title: story.title,
                subtitle: story.subtitle,
                excerpt: story.excerpt,
                coverImageUrl: story.coverImageUrl,
                readingTimeMinutes: story.readingTimeMinutes,
                likesTotal: story.likesTotal,
                visibility: story.visibility,
                publishedAt: story.publishedAt,
                author: { username: story.author.username, name: story.author.name },
                topics: story.topics.map((t) => ({ slug: t.topic.slug, name: t.topic.name })),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
