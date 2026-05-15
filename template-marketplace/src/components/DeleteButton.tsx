"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({
  templateId,
  templateTitle,
}: {
  templateId: string;
  templateTitle: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteIt() {
    const ok = confirm(
      `Permanently delete "${templateTitle}"? This can't be undone.\n\nUploadThing files stay on the CDN (delete those manually if you want them gone), but the template row, file metadata, and any reviews will be removed.`,
    );
    if (!ok) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/sell/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        const msg =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `Delete failed (${res.status})`;
        setError(msg);
        setPending(false);
        return;
      }
      router.push("/sell/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={deleteIt}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-2.5 text-sm font-medium text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Deleting
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            Delete forever
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="max-w-md text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
