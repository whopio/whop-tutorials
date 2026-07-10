"use client";

import { useState, useTransition } from "react";
import { Clock, MoreVertical, Share2 } from "lucide-react";
import { toggleWatchLater } from "@/lib/library-actions";
import { useEscape } from "@/hooks/use-escape";

/** DESIGN-6: the per-card "⋮" context menu — Save to Watch later + Copy link. */
export function VideoCardMenu({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  useEscape(open, () => setOpen(false));

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }

  function saveWatchLater() {
    setOpen(false);
    startTransition(async () => {
      const res = await toggleWatchLater(videoId);
      if ("error" in res) {
        window.location.href = `/sign-in?next=${encodeURIComponent(
          window.location.pathname + window.location.search,
        )}`;
      } else {
        flash(res.saved ? "Saved to Watch later" : "Removed from Watch later");
      }
    });
  }

  function copyLink() {
    setOpen(false);
    navigator.clipboard
      ?.writeText(`${window.location.origin}/watch?v=${videoId}`)
      .then(() => flash("Link copied"), () => {});
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((o) => !o)}
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-hover [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:grid"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
            <button
              type="button"
              onClick={saveWatchLater}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-hover"
            >
              <Clock className="h-4 w-4" /> Save to Watch later
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-hover"
            >
              <Share2 className="h-4 w-4" /> Copy link
            </button>
          </div>
        </>
      ) : null}

      {toast ? (
        <div className="absolute right-0 top-9 z-50 whitespace-nowrap rounded-lg bg-fg px-3 py-1.5 text-xs font-medium text-canvas shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
