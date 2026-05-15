"use client";

import { ExternalLink, Loader2, Wallet } from "lucide-react";
import { useState } from "react";

export function PayoutsButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/sell/payouts", { method: "POST" });
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        setError(
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `Request failed (${res.status})`,
        );
        setPending(false);
        return;
      }
      const url =
        body && typeof body === "object" && "url" in body && typeof body.url === "string"
          ? body.url
          : null;
      if (!url) {
        setError("Whop didn't return a portal URL");
        setPending(false);
        return;
      }
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Opening…
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            Manage payouts
            <ExternalLink className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
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
