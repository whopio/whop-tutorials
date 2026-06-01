"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  storyId: string;
  initialLiked: boolean;
  initialCount: number;
  authenticated: boolean;
  size?: "sm" | "md";
}

interface LikeState {
  liked: boolean;
  count: number;
}

export function LikeButton({
  storyId,
  initialLiked,
  initialCount,
  authenticated,
  size = "md",
}: Props) {
  const [state, setState] = useState<LikeState>({
    liked: initialLiked,
    count: initialCount,
  });
  const [optimistic, applyOptimistic] = useOptimistic<LikeState, void>(
    state,
    (prev, _action) => ({
      liked: !prev.liked,
      count: prev.count + (prev.liked ? -1 : 1),
    }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!authenticated) {
      window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setError(null);
    startTransition(async () => {
      applyOptimistic(undefined);
      try {
        const res = await fetch(`/api/stories/${storyId}/like`, { method: "POST" });
        if (!res.ok) throw new Error("Could not like");
        const data = (await res.json()) as { liked: boolean; likesTotal: number };
        setState({ liked: data.liked, count: data.likesTotal });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
        // Optimistic state will reset on the next render because we don't update setState on failure.
      }
    });
  }

  const sizeClasses = size === "sm" ? "size-4" : "size-[18px]";
  const textSize = size === "sm" ? "text-[13px]" : "text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={optimistic.liked ? "Unlike story" : "Like story"}
      aria-pressed={optimistic.liked}
      className="group inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
      title={error ?? undefined}
    >
      <Heart
        aria-hidden="true"
        className={cn(
          sizeClasses,
          "transition-transform group-active:scale-125",
          optimistic.liked && "fill-brand stroke-brand",
        )}
      />
      <span className={cn(textSize, optimistic.liked && "text-brand")}>
        {optimistic.count}
      </span>
    </button>
  );
}
