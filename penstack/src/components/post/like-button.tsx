"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { formatCount } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isLoggedIn?: boolean;
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  isLoggedIn,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function handleToggle() {
    if (!isLoggedIn) {
      window.location.href = `/api/auth/login?returnTo=${window.location.pathname}`;
      return;
    }

    // Optimistic update
    setLiked(!liked);
    setCount((c) => (liked ? c - 1 : c + 1));

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      // Revert on error
      setLiked(liked);
      setCount(count);
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
        liked
          ? "bg-red-50 text-red-600"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <Heart
        className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
      />
      {formatCount(count)}
    </button>
  );
}
