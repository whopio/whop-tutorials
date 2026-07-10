import Link from "next/link";
import { Upload } from "lucide-react";
import { getMyChannel } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration, formatTimeAgo, formatViews } from "@/lib/format";

export const metadata = { title: "Content - Wavora Studio" };

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  UNLISTED: "Unlisted",
  PRIVATE: "Private",
};

export default async function StudioVideosPage() {
  const channel = await getMyChannel();

  if (!channel) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border p-10 text-center">
        <h1 className="text-xl font-semibold">Create a channel</h1>
        <p className="mt-2 text-sm text-fg-muted">
          You need a channel before you can upload videos.
        </p>
        <Link
          href="/create-channel"
          className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90"
        >
          Create channel
        </Link>
      </div>
    );
  }

  const videos = await prisma.video.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      durationSeconds: true,
      visibility: true,
      viewCount: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Channel content</h1>
        <Link
          href="/studio/upload"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-fg-muted">
          No videos yet. Upload your first one to see it here and on the home feed.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center gap-4 p-3">
              <Link
                href={`/watch?v=${v.id}`}
                className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-hover"
              >
                {v.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                {v.durationSeconds > 0 ? (
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs text-white">
                    {formatDuration(v.durationSeconds)}
                  </span>
                ) : null}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/watch?v=${v.id}`}
                  className="line-clamp-1 font-medium hover:text-accent"
                >
                  {v.title}
                </Link>
                <p className="mt-1 text-xs text-fg-muted">
                  {VISIBILITY_LABEL[v.visibility] ?? v.visibility} •{" "}
                  {formatViews(v.viewCount)} • {formatTimeAgo(v.createdAt)}
                </p>
              </div>
              <Link
                href={`/studio/video/${v.id}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm text-fg-muted hover:bg-hover"
              >
                Details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
