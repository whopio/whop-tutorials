import type { Metadata } from "next";
import type { PublicationCategory } from "@/generated/prisma/client";
import { getTrendingWriters, getRecentPosts } from "@/services/explore-service";
import { TrendingWriters } from "@/components/explore/trending-writers";
import { PostFeed } from "@/components/explore/post-feed";
import { CategoryFilter } from "@/components/explore/category-filter";
import { CATEGORY_LABELS } from "@/constants/categories";

export const metadata: Metadata = {
  title: "Explore | Penstack",
  description: "Discover great writing from independent writers on Penstack.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const validCategory =
    category && category in CATEGORY_LABELS
      ? (category as PublicationCategory)
      : undefined;

  const [trendingWriters, { items: posts, nextCursor }] = await Promise.all([
    getTrendingWriters(),
    getRecentPosts({ category: validCategory }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-12">
        <TrendingWriters writers={trendingWriters} />
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold">Recent posts</h2>
        </div>
        <CategoryFilter />
        <PostFeed key={validCategory ?? "all"} initialPosts={posts} initialCursor={nextCursor} category={validCategory} />
      </section>
    </div>
  );
}
