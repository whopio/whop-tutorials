import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
import { getFeedVideos } from "@/lib/videos";
import { getHomeShorts } from "@/lib/shorts";
import { getContinueWatching } from "@/lib/history";
import type { VideoCategory } from "@/generated/prisma/client";
import { VideoCard } from "@/components/feed/video-card";
import { ShortsShelf } from "@/components/shorts/shorts-shelf";

// FEED-5: each chip maps to a category filter (or "All" for the full feed).
const CHIP_CATEGORY: Record<string, VideoCategory | undefined> = {
  All: undefined,
  Music: "MUSIC",
  Gaming: "GAMING",
  News: "NEWS",
  Sports: "SPORTS",
  Comedy: "COMEDY",
  Podcasts: "PODCASTS",
  Cooking: "COOKING",
  Tech: "TECH",
  Education: "EDUCATION",
  Entertainment: "ENTERTAINMENT",
};
const CHIPS = Object.keys(CHIP_CATEGORY);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ chip?: string | string[] }>;
}) {
  const { chip } = await searchParams;
  const activeChip =
    typeof chip === "string" && Object.hasOwn(CHIP_CATEGORY, chip)
      ? chip
      : "All";
  const category = CHIP_CATEGORY[activeChip];

  const user = await getCurrentUser();
  const [videos, continueWatching, shorts] = await Promise.all([
    getFeedVideos(24, category),
    // The personalized shelves only make sense on the unfiltered feed.
    !category && user ? getContinueWatching(user.id) : Promise.resolve([]),
    !category ? getHomeShorts() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-[2400px]">
      {/* Category chips (DESIGN-12 / FEED-5). */}
      <div className="sticky top-14 z-30 -mx-4 mb-4 flex gap-3 overflow-x-auto bg-canvas px-4 py-3 [scrollbar-width:none] sm:-mx-6 sm:px-6">
        {CHIPS.map((c) => (
          <Link
            key={c}
            href={c === "All" ? "/" : `/?chip=${c}`}
            scroll={false}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
              c === activeChip
                ? "bg-chip-active text-chip-active-fg"
                : "bg-chip hover:bg-hover-strong",
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {continueWatching.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">Continue watching</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
            {continueWatching.map((it) => (
              <div key={it.video.id} className="w-72 shrink-0 sm:w-80">
                <VideoCard
                  video={it.video}
                  progressSeconds={it.progressSeconds}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {shorts.length > 0 ? <ShortsShelf shorts={shorts} /> : null}

      {videos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-lg font-medium">
            {category ? "Nothing here yet" : "No videos yet"}
          </p>
          <p className="max-w-sm text-sm text-fg-muted">
            {category
              ? "No videos in this category yet. Try another chip."
              : "Be the first to upload. Create a channel and publish a video - it shows up right here."}
          </p>
          {category ? (
            <Link
              href="/"
              className="mt-2 rounded-full bg-chip px-5 py-2.5 font-medium hover:bg-hover-strong"
            >
              Back to all
            </Link>
          ) : (
            <Link
              href="/studio/upload"
              className="mt-2 rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90"
            >
              Upload a video
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
