import Link from "next/link";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatTimeAgo, formatViews } from "@/lib/format";
import { VideoCardMenu } from "./video-card-menu";

/** The shape the canonical card needs — mapped from a Video + its Channel. */
export type FeedVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  viewCount: number;
  publishedAt: Date | string | null;
  channel: {
    handle: string;
    name: string;
    avatarUrl: string | null;
  };
};

/**
 * DESIGN-6: the single canonical video card — 16:9 rounded thumbnail with a
 * duration badge, channel avatar, two-line-clamped title, channel name, and a
 * "views • relative time" line. Consumed by every feed surface.
 */
export function VideoCard({
  video,
  className,
  progressSeconds,
}: {
  video: FeedVideo;
  className?: string;
  progressSeconds?: number;
}) {
  const { channel } = video;
  const watchHref = `/watch?v=${video.id}`;
  const channelHref = `/@${channel.handle}`;

  return (
    <div className={cn("group flex flex-col gap-3", className)}>
      {/* Thumbnail */}
      <Link
        href={watchHref}
        className="relative block aspect-video w-full overflow-hidden rounded-xl bg-hover"
      >
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
        {video.durationSeconds > 0 ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-xs font-medium text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        ) : null}
        {/* LIB-3: red resume bar for partially-watched videos */}
        {progressSeconds && progressSeconds > 0 && video.durationSeconds > 0 ? (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
            <span
              className="block h-full bg-brand"
              style={{
                width: `${Math.min(100, (progressSeconds / video.durationSeconds) * 100)}%`,
              }}
            />
          </span>
        ) : null}
      </Link>

      {/* Meta row */}
      <div className="flex gap-3">
        <Link
          href={channelHref}
          aria-label={channel.name}
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-hover"
        >
          {channel.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-fg-muted" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={watchHref}>
            <h3 className="line-clamp-2 text-sm font-medium leading-5 text-fg">
              {video.title}
            </h3>
          </Link>
          <Link
            href={channelHref}
            className="mt-1 block truncate text-sm text-fg-muted hover:text-fg"
          >
            {channel.name}
          </Link>
          <p className="truncate text-sm text-fg-muted">
            {formatViews(video.viewCount)}
            {video.publishedAt ? ` • ${formatTimeAgo(video.publishedAt)}` : ""}
          </p>
        </div>

        <VideoCardMenu videoId={video.id} />
      </div>
    </div>
  );
}
