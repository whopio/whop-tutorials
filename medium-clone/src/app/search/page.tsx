import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StoryCard } from "@/components/StoryCard";

export const metadata: Metadata = { title: "Search" };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

/**
 * Search results. Plain GET form, server-side query. Matches story titles
 * and subtitles case-insensitively. v1 only searches stories — authors and
 * topics can be added later without changing the URL contract.
 */
export default async function SearchPage({ searchParams }: PageProps) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  const stories = q
    ? await prisma.story.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { subtitle: { contains: q, mode: "insensitive" } },
            { excerpt: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: [{ likesTotal: "desc" }, { publishedAt: "desc" }],
        take: 30,
        include: {
          author: { select: { username: true, name: true } },
          topics: { include: { topic: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12">
      {/* Search form — always visible at the top, auto-focuses on first paint */}
      <form
        action="/search"
        method="GET"
        role="search"
        className="flex items-center gap-2 px-4 h-12 rounded-pill bg-surface focus-within:ring-1 focus-within:ring-text-primary/30"
      >
        <SearchIcon
          aria-hidden="true"
          className="size-5 text-text-tertiary shrink-0"
        />
        <input
          autoFocus
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search stories…"
          aria-label="Search Storyline"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[16px] text-text-primary placeholder:text-text-tertiary"
        />
      </form>

      {/* Body */}
      {!q && (
        <div className="mt-12 text-center text-text-secondary">
          <p className="text-sm">Type a title, topic, or phrase to begin.</p>
        </div>
      )}

      {q && stories.length === 0 && (
        <div className="mt-12 text-center">
          <p className="font-sans font-bold text-[18px] text-text-primary">
            No matches for &ldquo;{q}&rdquo;
          </p>
          <p className="text-sm text-text-secondary mt-1">
            Try a broader phrase or a different word.
          </p>
        </div>
      )}

      {q && stories.length > 0 && (
        <section className="mt-6">
          <h1 className="font-sans font-bold text-[18px] text-text-primary mb-3">
            {stories.length} {stories.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
          </h1>
          <div className="border-t border-border">
            {stories.map((story) => (
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
                  author: {
                    username: story.author.username,
                    name: story.author.name,
                  },
                  topics: story.topics.map((t) => ({
                    slug: t.topic.slug,
                    name: t.topic.name,
                  })),
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
