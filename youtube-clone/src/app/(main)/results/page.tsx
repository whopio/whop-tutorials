import Link from "next/link";
import { User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDuration, formatTimeAgo, formatViews } from "@/lib/format";

type SearchParams = Promise<{ search_query?: string | string[] }>;

const queryOf = (search_query: string | string[] | undefined) =>
  (Array.isArray(search_query) ? search_query[0] : (search_query ?? "")).trim();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = queryOf((await searchParams).search_query);
  return { title: q ? `${q} - Wavora` : "Search - Wavora" };
}

/**
 * FEED-6/7: search results. We match published videos by title, channel name,
 * or @handle (case-insensitive) and rank by view count then recency, rendered
 * as wide list rows that stack on mobile.
 */
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = queryOf((await searchParams).search_query);

  const videos = q
    ? await prisma.video.findMany({
        where: {
          visibility: "PUBLIC",
          status: "READY",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { channel: { name: { contains: q, mode: "insensitive" } } },
            { channel: { handle: { contains: q, mode: "insensitive" } } },
          ],
        },
        orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }],
        take: 40,
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          durationSeconds: true,
          viewCount: true,
          publishedAt: true,
          channel: { select: { handle: true, name: true, avatarUrl: true } },
        },
      })
    : [];

  if (!q) {
    return (
      <p className="py-16 text-center text-sm text-fg-muted">
        Type a search to find videos.
      </p>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium">No results found</p>
        <p className="mt-1 text-sm text-fg-muted">
          Try different keywords for &ldquo;{q}&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      {videos.map((v) => (
        <Link
          key={v.id}
          href={`/watch?v=${v.id}`}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-hover sm:w-[360px]">
            {v.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
            {v.durationSeconds > 0 ? (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-xs font-medium text-white">
                {formatDuration(v.durationSeconds)}
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg leading-6">{v.title}</h3>
            <p className="mt-1 text-xs text-fg-muted">
              {formatViews(v.viewCount)}
              {v.publishedAt ? ` • ${formatTimeAgo(v.publishedAt)}` : ""}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-hover">
                {v.channel.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.channel.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-3.5 w-3.5 text-fg-muted" />
                )}
              </span>
              <span className="text-xs text-fg-muted">{v.channel.name}</span>
            </div>
            {v.description ? (
              <p className="mt-2 line-clamp-2 text-xs text-fg-muted">
                {v.description}
              </p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
