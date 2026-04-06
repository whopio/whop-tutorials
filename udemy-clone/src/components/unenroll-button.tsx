"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function UnenrollButton({
  enrollmentId,
  courseTitle,
}: {
  enrollmentId: string;
  courseTitle: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUnenroll() {
    setLoading(true);
    await fetch(`/api/enrollments/${enrollmentId}`, { method: "DELETE" });
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
        <span className="text-xs text-[var(--color-error)]">
          Leave &ldquo;{courseTitle.slice(0, 20)}&rdquo;?
        </span>
        <button
          onClick={handleUnenroll}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-error)] text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-3 py-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        setConfirming(true);
      }}
      className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
      title="Unenroll from course"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
