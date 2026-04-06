"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  productId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({
  productId,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Optimistic update
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    startTransition(async () => {
      const res = await fetch(`/api/products/${productId}/like`, {
        method: "POST",
      });

      if (!res.ok) {
        // Revert on failure
        setLiked(liked);
        setCount(count);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
        liked
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-border bg-surface text-text-secondary hover:border-accent/30 hover:text-accent"
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-transform",
          liked && "fill-current scale-110"
        )}
        aria-hidden="true"
      />
      {count}
    </button>
  );
}
