"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  topicSlug: string;
  initialFollowing: boolean;
  authenticated: boolean;
}

export function TopicFollowButton({ topicSlug, initialFollowing, authenticated }: Props) {
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
      const res = await fetch(`/api/topics/${topicSlug}/follow`, { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { following: boolean };
      setState(data.following);
    });
  }

  // Mirrors FollowButton: inactive = filled primary, active = outlined secondary.
  // text-background inverts cleanly between light/dark themes.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors",
        optimistic
          ? "border border-border text-text-secondary bg-transparent hover:border-error hover:text-error"
          : "bg-text-primary text-background hover:bg-text-primary/85",
      )}
    >
      {optimistic ? (
        <>
          <Check aria-hidden="true" className="size-3.5" /> Following
        </>
      ) : (
        <>
          <Plus aria-hidden="true" className="size-3.5" /> Follow topic
        </>
      )}
    </button>
  );
}
