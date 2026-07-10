"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { createMembershipCheckout } from "@/lib/checkout-actions";
import { CheckoutEmbedPanel } from "@/components/checkout/checkout-embed-panel";
import { useEscape } from "@/hooks/use-escape";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
};

/** MEMBERSHIP-3/4: the Join button + tier picker + embedded checkout. */
export function JoinMembership({
  tiers,
  isSignedIn,
  isMember,
  environment,
}: {
  tiers: Tier[];
  isSignedIn: boolean;
  isMember: boolean;
  environment: "sandbox" | "production";
}) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEscape(open, close);

  if (isMember) {
    return (
      <span className="rounded-full bg-chip px-4 py-2 text-sm font-medium">
        Member ✓
      </span>
    );
  }
  if (tiers.length === 0) return null;

  function pick(tierId: string) {
    if (!isSignedIn) {
      window.location.href = `/sign-in?next=${encodeURIComponent(
        window.location.pathname,
      )}`;
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createMembershipCheckout(tierId);
      if ("error" in res) setError(res.error);
      else setSessionId(res.sessionId);
    });
  }

  function close() {
    setOpen(false);
    setSessionId(null);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
      >
        Join
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose your membership"
            className="relative max-h-[92vh] w-full max-w-md overflow-auto rounded-2xl bg-canvas p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full hover:bg-hover"
            >
              <X className="h-5 w-5" />
            </button>
            {sessionId ? (
              <div className="pt-6">
                <CheckoutEmbedPanel
                  sessionId={sessionId}
                  environment={environment}
                  onComplete={() => window.location.reload()}
                />
              </div>
            ) : (
              <div className="pt-2">
                <h3 className="text-lg font-bold">Choose your membership</h3>
                <div className="mt-4 flex flex-col gap-2">
                  {tiers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pick(t.id)}
                      disabled={pending}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-left hover:border-accent disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{t.name}</span>
                        {t.description ? (
                          <span className="block truncate text-xs text-fg-muted">
                            {t.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-medium">
                        ${(t.priceCents / 100).toFixed(2)}/mo
                      </span>
                    </button>
                  ))}
                </div>
                {error ? (
                  <p className="mt-3 text-sm text-red-500">{error}</p>
                ) : null}
                {pending ? (
                  <p className="mt-3 text-sm text-fg-muted">Starting checkout…</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
