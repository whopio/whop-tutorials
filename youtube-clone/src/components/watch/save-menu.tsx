"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Plus, X } from "lucide-react";
import { toggleWatchLater } from "@/lib/library-actions";
import {
  createPlaylistWithVideo,
  togglePlaylistItem,
} from "@/lib/playlist-actions";
import { useEscape } from "@/hooks/use-escape";
import { cn } from "@/lib/utils";

type Option = {
  id: string;
  title: string;
  contains: boolean;
};

function goSignIn() {
  window.location.href = `/sign-in?next=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
}

/**
 * WATCH-12b + LIB-10: the "Save to…" control. The button reflects whether the
 * video is in ANY list; the popover toggles Watch later and each user playlist,
 * and can create a new playlist with the video already in it. Every toggle is
 * optimistic and reconciled against the server action's result.
 */
export function SaveMenu({
  videoId,
  isSignedIn,
  initialSaved,
  playlists,
}: {
  videoId: string;
  isSignedIn: boolean;
  initialSaved: boolean;
  playlists: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [options, setOptions] = useState<Option[]>(playlists);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [, startTransition] = useTransition();

  useEscape(open, () => setOpen(false));

  const anySaved = saved || options.some((o) => o.contains);

  function onButton() {
    if (!isSignedIn) return goSignIn();
    setOpen((v) => !v);
  }

  function onToggleWatchLater() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleWatchLater(videoId);
      setSaved("error" in res ? !next : res.saved);
    });
  }

  function onTogglePlaylist(id: string) {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, contains: !o.contains } : o)),
    );
    startTransition(async () => {
      const res = await togglePlaylistItem(id, videoId);
      if ("error" in res) {
        setOptions((prev) =>
          prev.map((o) => (o.id === id ? { ...o, contains: !o.contains } : o)),
        );
      }
    });
  }

  function onCreate() {
    const title = newTitle.trim();
    if (!title) return;
    startTransition(async () => {
      const res = await createPlaylistWithVideo(title, "PRIVATE", videoId);
      if ("id" in res) {
        setOptions((prev) => [
          { id: res.id, title, contains: true },
          ...prev,
        ]);
        setNewTitle("");
        setCreating(false);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onButton}
        className={cn(
          "flex items-center gap-2 rounded-full bg-chip px-4 py-2 text-sm font-medium hover:bg-hover-strong",
          anySaved && "text-accent",
        )}
      >
        {anySaved ? (
          <BookmarkCheck className="h-5 w-5" />
        ) : (
          <Bookmark className="h-5 w-5" />
        )}
        {anySaved ? "Saved" : "Save"}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Save to…</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-6 w-6 place-items-center rounded-full hover:bg-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-hover">
              <input
                type="checkbox"
                checked={saved}
                onChange={onToggleWatchLater}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">Watch later</span>
            </label>

            {options.map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-hover"
              >
                <input
                  type="checkbox"
                  checked={o.contains}
                  onChange={() => onTogglePlaylist(o.id)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="truncate text-sm">{o.title}</span>
              </label>
            ))}

            <div className="mt-2 border-t border-border pt-2">
              {creating ? (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onCreate();
                    }}
                    placeholder="Playlist name"
                    maxLength={150}
                    className="w-full rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setNewTitle("");
                      }}
                      className="rounded-full px-3 py-1 text-sm hover:bg-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newTitle.trim()}
                      onClick={onCreate}
                      className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-fg disabled:opacity-60"
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-hover"
                >
                  <Plus className="h-4 w-4" /> New playlist
                </button>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
