import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { formatViews } from "@/lib/format";
import type { FeedVideo } from "@/components/feed/video-card";

/** FEED-13: the home "Shorts" shelf — a horizontal row of portrait tiles. */
export function ShortsShelf({ shorts }: { shorts: FeedVideo[] }) {
  if (shorts.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Clapperboard className="h-6 w-6 text-brand" />
        <Link href="/waves" className="text-lg font-bold hover:underline">
          Waves
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {shorts.map((s) => (
          <Link
            key={s.id}
            href={`/waves?v=${s.id}`}
            className="group w-40 shrink-0 sm:w-44"
          >
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-hover">
              {s.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-medium">{s.title}</h3>
            <p className="text-xs text-fg-muted">{formatViews(s.viewCount)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
