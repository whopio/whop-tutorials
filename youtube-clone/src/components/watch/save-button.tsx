"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleWatchLater } from "@/lib/library-actions";
import { cn } from "@/lib/utils";

function goSignIn() {
  window.location.href = `/sign-in?next=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
}

/** WATCH-12b: Save to / remove from Watch later, with an optimistic toggle. */
export function SaveButton({
  videoId,
  isSignedIn,
  initialSaved,
}: {
  videoId: string;
  isSignedIn: boolean;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!isSignedIn) return goSignIn();
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleWatchLater(videoId);
      if ("error" in res) setSaved(!next);
      else setSaved(res.saved);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "flex items-center gap-2 rounded-full bg-chip px-4 py-2 text-sm font-medium hover:bg-hover-strong disabled:opacity-60",
        saved && "text-accent",
      )}
    >
      {saved ? (
        <BookmarkCheck className="h-5 w-5" />
      ) : (
        <Bookmark className="h-5 w-5" />
      )}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
