"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface Props {
  storyId: string;
  initialBookmarked: boolean;
  authenticated: boolean;
}

export function BookmarkButton({ storyId, initialBookmarked, authenticated }: Props) {
  const [state, setState] = useState(initialBookmarked);
  const [optimistic, applyOptimistic] = useOptimistic(state, (v: boolean, _action: void) => !v);
  const [, startTransition] = useTransition();

  async function onClick() {
    if (!authenticated) {
      window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    startTransition(async () => {
      applyOptimistic(undefined);
      const res = await fetch(`/api/stories/${storyId}/bookmark`, { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { bookmarked: boolean };
      setState(data.bookmarked);
    });
  }

  const Icon = optimistic ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={optimistic ? "Remove bookmark" : "Bookmark story"}
      aria-pressed={optimistic}
      className="text-text-secondary hover:text-text-primary transition-colors"
    >
      <Icon
        aria-hidden="true"
        className="size-[18px]"
        fill={optimistic ? "currentColor" : "none"}
      />
    </button>
  );
}
