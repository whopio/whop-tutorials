"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { deletePlaylist, removeFromPlaylist } from "@/lib/playlist-actions";
import { formatDuration, formatViews } from "@/lib/format";
import type { FeedVideo } from "@/components/feed/video-card";

/** LIB-11: the ordered video rows of a user playlist, with owner remove controls. */
export function PlaylistView({
  playlistId,
  videos,
  isOwner,
}: {
  playlistId: string;
  videos: FeedVideo[];
  isOwner: boolean;
}) {
  const [items, setItems] = useState(videos);
  const [, startTransition] = useTransition();

  function remove(id: string) {
    setItems((prev) => prev.filter((v) => v.id !== id));
    startTransition(async () => {
      await removeFromPlaylist(playlistId, id);
    });
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-fg-muted">
        No videos in this playlist yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {items.map((v, i) => (
        <li
          key={v.id}
          className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-hover"
        >
          <span className="w-6 shrink-0 text-center text-sm text-fg-muted">
            {i + 1}
          </span>
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
              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs font-medium text-white">
                {formatDuration(v.durationSeconds)}
              </span>
            ) : null}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/watch?v=${v.id}`}>
              <h3 className="line-clamp-2 text-sm font-medium">{v.title}</h3>
            </Link>
            <Link
              href={`/@${v.channel.handle}`}
              className="mt-1 block truncate text-xs text-fg-muted hover:text-fg"
            >
              {v.channel.name}
            </Link>
            <p className="truncate text-xs text-fg-muted">
              {formatViews(v.viewCount)}
            </p>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={() => remove(v.id)}
              aria-label="Remove from playlist"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-hover-strong [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** LIB-12: delete a playlist, with a two-step confirm, then route to the list. */
export function DeletePlaylistButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const res = await deletePlaylist(id);
      if ("ok" in res) router.push("/feed/playlists");
    });
  }

  if (confirming) {
    return (
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full bg-chip px-4 py-2 text-sm font-medium hover:bg-hover-strong"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="mt-3 flex items-center gap-2 text-sm text-fg-muted hover:text-brand"
    >
      <Trash2 className="h-4 w-4" /> Delete playlist
    </button>
  );
}
