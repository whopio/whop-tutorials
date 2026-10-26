"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";

/**
 * Webhook race state. The buyer hits this page right after onComplete fires
 * in the checkout modal, but the payment.succeeded webhook can lag the
 * client-side success by a couple seconds (Whop fires it async).
 *
 * We router.refresh() every 2s up to a cap, then degrade to a "check your
 * email" panel. The page is a server component, so a refresh re-runs the
 * Purchase lookup; the moment the row exists the parent renders the
 * download UI instead of this component.
 */
const POLL_MS = 2000;
const MAX_POLLS = 15; // ~30 seconds

export function ProcessingAccess() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (stalled) return;
    const id = setTimeout(() => {
      if (attempts + 1 >= MAX_POLLS) {
        setStalled(true);
        return;
      }
      setAttempts((n) => n + 1);
      router.refresh();
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [attempts, stalled, router]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        {stalled ? (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
              <MailCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold text-[var(--color-text-primary)]">
              Still working on it
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Your payment went through, but our system hasn&rsquo;t finished
              recording it. Check your email — Whop sends a receipt with the
              same link, and reloading this page in a moment should work too.
            </p>
            <button
              type="button"
              onClick={() => {
                setStalled(false);
                setAttempts(0);
                router.refresh();
              }}
              className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold text-[var(--color-text-primary)]">
              Finalizing your purchase
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Confirming your payment with Whop. This usually takes a couple
              of seconds — don&rsquo;t close the tab.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
