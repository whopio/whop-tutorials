import { notFound } from "next/navigation";
import { getByCategory } from "@/lib/explore";
import { VideoGrid } from "@/components/feed/video-grid";
import type { VideoCategory } from "@/generated/prisma/client";

/** The browseable Explore categories, keyed by their lowercase URL slug. */
const CATEGORIES: Record<string, VideoCategory> = {
  music: "MUSIC",
  gaming: "GAMING",
  news: "NEWS",
  sports: "SPORTS",
  comedy: "COMEDY",
  education: "EDUCATION",
  entertainment: "ENTERTAINMENT",
  tech: "TECH",
  podcasts: "PODCASTS",
  cooking: "COOKING",
  other: "OTHER",
};

/** Title-case a category enum for headings ("MUSIC" → "Music"). */
function titleCase(category: VideoCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

/** Resolve a URL slug to its enum, guarding against non-own keys. */
function categoryOf(slug: string): VideoCategory | undefined {
  const key = slug.toLowerCase();
  return Object.hasOwn(CATEGORIES, key) ? CATEGORIES[key] : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const enumValue = categoryOf(category);
  if (!enumValue) return { title: "Explore - Wavora" };
  return { title: `${titleCase(enumValue)} - Wavora` };
}

export default async function ExploreCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const enumValue = categoryOf(category);
  if (!enumValue) notFound();

  const videos = await getByCategory(enumValue);

  return (
    <div className="mx-auto max-w-[2400px]">
      <h1 className="mb-6 text-2xl font-bold">{titleCase(enumValue)}</h1>
      {videos.length > 0 ? (
        <VideoGrid videos={videos} />
      ) : (
        <div className="py-16 text-center text-sm text-fg-muted">
          No {titleCase(enumValue)} videos yet. Check back soon.
        </div>
      )}
    </div>
  );
}
