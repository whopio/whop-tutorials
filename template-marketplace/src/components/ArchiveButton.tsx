"use client";

import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveButton({
  templateId,
  isArchived,
}: {
  templateId: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/sell/templates/${templateId}/archive`, {
        method: isArchived ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        setError(
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `Request failed (${res.status})`,
        );
        setPending(false);
        return;
      }
      router.refresh();
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isArchived ? "Unarchiving" : "Archiving"}
          </>
        ) : isArchived ? (
          <>
            <ArchiveRestore className="h-4 w-4" />
            Unarchive
          </>
        ) : (
          <>
            <Archive className="h-4 w-4" />
            Archive
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
