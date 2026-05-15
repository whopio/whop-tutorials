"use client";

import { ArrowRight, FlaskConical, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function BecomeSellerButton({ isSandbox }: { isSandbox: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!confirmOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  function startFlow() {
    if (isSandbox) {
      setConfirmOpen(true);
    } else {
      void onboard();
    }
  }

  async function onboard() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);
    setErrorDetail(null);
    try {
      const res = await fetch("/api/sell/onboard", { method: "POST" });
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        const errMsg =
          (body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : null) ?? `Request failed (${res.status})`;
        const detail =
          body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
            ? body.detail
            : null;
        setError(errMsg);
        setErrorDetail(detail);
        setPending(false);
        return;
      }
      const url =
        body && typeof body === "object" && "url" in body && typeof body.url === "string"
          ? body.url
          : "/sell/dashboard";
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={startFlow}
        disabled={pending}
        className="group inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up your seller account…
          </>
        ) : (
          <>
            Become a seller
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      {error && (
        <div role="alert" className="max-w-xl rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
          <div className="font-medium">{error}</div>
          {errorDetail && (
            <pre className="mt-2 whitespace-pre-wrap break-all text-xs opacity-80">
              {errorDetail}
            </pre>
          )}
        </div>
      )}

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="sandbox-modal-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setConfirmOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
              <FlaskConical className="h-5 w-5" />
            </div>

            <h2
              id="sandbox-modal-title"
              className="mt-4 font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]"
            >
              We&rsquo;re skipping KYC for this demo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Stax is running on the Whop sandbox, so we&rsquo;ll create a
              connected sandbox company for you and mark you as a seller right
              away &mdash; no identity verification required.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">In production</strong>,
              you&rsquo;d be redirected to Whop&rsquo;s hosted KYC flow to verify
              your identity, link a payout method, and accept tax forms. That
              path is wired up; we just don&rsquo;t exercise it in the demo.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onboard}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
