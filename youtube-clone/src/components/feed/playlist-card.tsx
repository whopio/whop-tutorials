import Link from "next/link";
import { ListVideo } from "lucide-react";
import type { PlaylistSummary } from "@/lib/playlists";

/** LIB-12: a playlist tile — cover frame with an item-count overlay strip. */
export function PlaylistCard({ playlist }: { playlist: PlaylistSummary }) {
  return (
    <Link
      href={`/playlist?list=${playlist.id}`}
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-hover">
        {playlist.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-fg-muted">
            <ListVideo className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-y-0 right-0 flex w-2/5 flex-col items-center justify-center gap-1 bg-black/70 text-white">
          <ListVideo className="h-5 w-5" />
          <span className="text-xs font-medium">{playlist.itemCount}</span>
        </div>
      </div>
      <h3 className="line-clamp-2 text-sm font-medium">{playlist.title}</h3>
      <span className="text-xs text-fg-muted">View full playlist</span>
    </Link>
  );
}
