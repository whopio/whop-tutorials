"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface AccountCardProps {
  plan: string;
  planType: string | null;
  updatedAt: Date | null;
  waitingForWebhook: boolean;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export function AccountCard({
  plan,
  planType,
  updatedAt,
  waitingForWebhook,
}: AccountCardProps) {
  const router = useRouter();
  const isPro = plan === "pro";
  const planLabel = isPro
    ? planType === "lifetime"
      ? "Pro (Lifetime)"
      : "Pro"
    : "Free";

  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!waitingForWebhook) return;
    if (startedAt.current === null) startedAt.current = Date.now();

    const poll = window.setInterval(() => {
      if (
        startedAt.current !== null &&
        Date.now() - startedAt.current > POLL_TIMEOUT_MS
      ) {
        setTimedOut(true);
        window.clearInterval(poll);
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(poll);
  }, [waitingForWebhook, router]);

  return (
    <section
      aria-labelledby="account-heading"
      className="bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-[var(--shadow-card)] p-6 border-l-[3px] border-l-[color:var(--color-accent-success)]"
    >
      <header className="flex items-center gap-3 mb-5">
        <h2 id="account-heading" className="font-sans text-base font-semibold">
          Your account
        </h2>
        {isPro && (
          <span className="text-[11px] uppercase tracking-wider font-semibold bg-[color:var(--color-accent-success)] text-[color:var(--color-fg-primary)] px-2 py-[2px] rounded-full animate-fade">
            Updated
          </span>
        )}
        {waitingForWebhook && !timedOut && (
          <span className="text-[11px] uppercase tracking-wider font-semibold bg-[color:var(--color-surface-alt)] text-[color:var(--color-fg-muted)] px-2 py-[2px] rounded-full inline-flex items-center gap-1.5">
            <Loader2
              size={11}
              strokeWidth={2.5}
              className="animate-spin-slow"
              aria-hidden="true"
            />
            Syncing
          </span>
        )}
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
            Plan
          </dt>
          <dd className="font-medium">{planLabel}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
            Updated
          </dt>
          <dd className="font-medium tabular">
            {updatedAt
              ? updatedAt.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "\u2014"}
          </dd>
        </div>
      </dl>
      {waitingForWebhook && !timedOut && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex items-start gap-3 rounded-[var(--radius-sm)] bg-[color:var(--color-surface-alt)] border border-[color:var(--color-border)] p-3 text-sm"
        >
          <Loader2
            size={16}
            strokeWidth={1.75}
            className="mt-[2px] shrink-0 animate-spin-slow text-[color:var(--color-fg-muted)]"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1">
            <span className="font-medium">Activating your Pro access</span>
            <span className="text-[color:var(--color-fg-muted)]">
              Waiting for the webhook from Whop. This usually takes a second or two.
            </span>
          </div>
        </div>
      )}
      {waitingForWebhook && timedOut && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-5 flex items-start gap-3 rounded-[var(--radius-sm)] bg-[#fff6e0] border border-[#e6d8a8] p-3 text-sm"
        >
          <div className="flex flex-col gap-2 w-full">
            <span className="font-medium">
              The webhook is taking longer than expected.
            </span>
            <span className="text-[color:var(--color-fg-muted)]">
              This usually means the webhook isn&rsquo;t wired up correctly. Check
              your Whop dashboard &rarr; Webhooks &rarr; delivery log for a 200
              response on a recent event.
            </span>
            <button
              type="button"
              onClick={() => {
                startedAt.current = Date.now();
                setTimedOut(false);
                router.refresh();
              }}
              className="self-start inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--color-surface-alt)] transition-colors"
            >
              Check again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
