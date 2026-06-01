import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Topics" };

export default async function TopicsPage() {
  const topics = await prisma.topic.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      _count: { select: { stories: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-display text-[36px] sm:text-[48px] text-text-primary leading-tight">
        Topics
      </h1>
      <p className="mt-2 text-text-secondary">
        Follow a few. The feed sorts itself out.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={`/tag/${t.slug}`}
            className="px-4 py-4 rounded-md border border-border bg-background hover:border-text-primary transition-colors"
          >
            <div className="font-sans font-semibold text-text-primary">{t.name}</div>
            <div className="text-xs text-text-tertiary mt-0.5">
              {t._count.stories} {t._count.stories === 1 ? "story" : "stories"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
