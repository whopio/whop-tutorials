import Link from "next/link";
import { resolveChannel } from "@/lib/channels";
import { getChannelShorts } from "@/lib/shorts";
import { formatViews } from "@/lib/format";

/** CHANNEL-12: a channel's Shorts as a portrait grid; each opens the player. */
export default async function ChannelShortsPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const channel = await resolveChannel(handle);
  const shorts = await getChannelShorts(channel.id);

  if (shorts.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-fg-muted">
        This channel hasn&apos;t posted any Waves yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {shorts.map((s) => (
        <Link
          key={s.id}
          href={`/waves?v=${s.id}`}
          className="group flex flex-col gap-2"
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
          <div>
            <h3 className="line-clamp-2 text-sm font-medium">{s.title}</h3>
            <p className="mt-0.5 text-xs text-fg-muted">
              {formatViews(s.viewCount)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
