"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toggleReaction } from "@/lib/social-actions";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type Reaction = "LIKE" | "DISLIKE" | null;

function goSignIn() {
  window.location.href = `/sign-in?next=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
}

/**
 * WATCH-5 / SOCIAL-3/4/5: the like/dislike pill. The like count is public; the
 * dislike count is never shown. Likes and dislikes are mutually exclusive.
 */
export function LikeDislike({
  videoId,
  isSignedIn,
  initialReaction,
  initialLikeCount,
}: {
  videoId: string;
  isSignedIn: boolean;
  initialReaction: Reaction;
  initialLikeCount: number;
}) {
  const [reaction, setReaction] = useState<Reaction>(initialReaction);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [pending, startTransition] = useTransition();

  function react(type: "LIKE" | "DISLIKE") {
    if (!isSignedIn) return goSignIn();

    const prevReaction = reaction;
    const prevCount = likeCount;

    let nextReaction: Reaction;
    let nextCount = likeCount;
    if (reaction === type) {
      nextReaction = null;
      if (type === "LIKE") nextCount -= 1;
    } else {
      nextReaction = type;
      if (type === "LIKE") nextCount += 1;
      if (reaction === "LIKE") nextCount -= 1; // switching away from a like
    }

    setReaction(nextReaction); // optimistic
    setLikeCount(nextCount);

    startTransition(async () => {
      const res = await toggleReaction(videoId, type);
      if ("error" in res) {
        setReaction(prevReaction);
        setLikeCount(prevCount);
      } else {
        setReaction(res.reaction);
        setLikeCount(res.likeCount);
      }
    });
  }

  return (
    <div className="flex items-center rounded-full bg-chip">
      <button
        type="button"
        onClick={() => react("LIKE")}
        disabled={pending}
        aria-pressed={reaction === "LIKE"}
        className={cn(
          "flex items-center gap-2 rounded-l-full py-2 pl-4 pr-3 transition-colors disabled:opacity-60",
          reaction === "LIKE"
            ? "bg-accent text-accent-fg"
            : "hover:bg-hover-strong",
        )}
      >
        <ThumbsUp
          className={cn("h-5 w-5", reaction === "LIKE" && "fill-current")}
        />
        <span className="text-sm font-medium">
          {likeCount > 0 ? formatCompact(likeCount) : ""}
        </span>
      </button>
      <span className="h-6 w-px bg-border" />
      <button
        type="button"
        onClick={() => react("DISLIKE")}
        disabled={pending}
        aria-pressed={reaction === "DISLIKE"}
        aria-label="Dislike"
        className="rounded-r-full px-4 py-2 hover:bg-hover-strong disabled:opacity-60"
      >
        <ThumbsDown
          className={cn("h-5 w-5", reaction === "DISLIKE" && "fill-current")}
        />
      </button>
    </div>
  );
}
