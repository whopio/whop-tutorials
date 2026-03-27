"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle } from "lucide-react";

export function MarkCompleteButton({
  lessonId,
  isCompleted,
}: {
  lessonId: string;
  isCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (completed || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
      });
      if (res.ok) {
        setCompleted(true);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-[var(--color-success)]">
        <CheckCircle className="w-4 h-4" /> Completed
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
    >
      <Circle className="w-4 h-4" />
      {loading ? "Saving..." : "Mark as Complete"}
    </button>
  );
}
