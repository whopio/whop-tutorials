"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteStoryButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="text-sm text-error hover:text-error/80 disabled:opacity-50"
    >
      {isPending ? "Deleting…" : confirming ? "Confirm delete" : "Delete"}
    </button>
  );
}
