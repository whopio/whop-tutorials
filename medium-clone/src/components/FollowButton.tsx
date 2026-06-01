"use client";

import { useOptimistic, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

interface Props {
  username: string;
  initialFollowing: boolean;
  authenticated: boolean;
  size?: "sm" | "md";
}

export function FollowButton({
  username,
  initialFollowing,
  authenticated,
  size = "md",
}: Props) {
  const [state, setState] = useState(initialFollowing);
  const [optimistic, applyOptimistic] = useOptimistic(state, (v: boolean, _action: void) => !v);
  const [, startTransition] = useTransition();

  async function onClick() {
    if (!authenticated) {
      window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    startTransition(async () => {
      applyOptimistic(undefined);
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { following: boolean };
      setState(data.following);
    });
  }

  const padding = size === "sm" ? "px-3 py-1" : "px-4 py-1.5";

  // Two states, Medium convention:
  //   Inactive (Follow)   = filled primary, accent bg on theme-aware background text
  //   Active (Following)  = outlined secondary, red-tinted hover to hint at unfollow
  // Both use `text-background` rather than `text-white` so the label inverts
  // correctly in dark mode (text-primary becomes near-white there).
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      className={cn(
        "inline-flex items-center rounded-pill text-sm font-medium transition-colors",
        padding,
        optimistic
          ? "border border-border text-text-secondary bg-transparent hover:border-error hover:text-error"
          : "bg-text-primary text-background hover:bg-text-primary/85",
      )}
    >
      {optimistic ? "Following" : "Follow"}
    </button>
  );
}
