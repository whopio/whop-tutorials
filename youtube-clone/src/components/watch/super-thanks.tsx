"use client";

import { useState, useTransition } from "react";
import { Heart, X } from "lucide-react";
import { createTipCheckout } from "@/lib/checkout-actions";
import { CheckoutEmbedPanel } from "@/components/checkout/checkout-embed-panel";
import { TIP_PRESETS_CENTS } from "@/lib/money";
import { useEscape } from "@/hooks/use-escape";
import { cn } from "@/lib/utils";

/** TIPS-2/4/5/7: the Cheers button + amount/message dialog + checkout. */
export function SuperThanks({
  videoId,
  isSignedIn,
  environment,
}: {
  videoId: string;
  isSignedIn: boolean;
  environment: "sandbox" | "production";
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(500);
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    if (!isSignedIn) {
      window.location.href = `/sign-in?next=${encodeURIComponent(
        window.location.pathname + window.location.search,
      )}`;
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createTipCheckout(videoId, amount, message);
      if ("error" in res) setError(res.error);
      else setSessionId(res.sessionId);
    });
  }

  function close() {
    setOpen(false);
    setSessionId(null);
    setError(null);
  }

  useEscape(open, close);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-chip px-4 py-2 text-sm font-medium hover:bg-hover-strong"
      >
        <Heart className="h-5 w-5" />
        Cheers
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send Cheers"
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
                <h3 className="text-lg font-bold">Send Cheers</h3>
                <p className="mt-1 text-sm text-fg-muted">
                  Show your support - the video stays free.
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {TIP_PRESETS_CENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAmount(c)}
                      className={cn(
                        "rounded-full border px-2 py-2 text-sm font-medium",
                        amount === c
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-hover",
                      )}
                    >
                      ${c / 100}
                    </button>
                  ))}
                </div>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  placeholder="Add a message (optional)"
                  className="mt-4 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
                {error ? (
                  <p className="mt-3 text-sm text-red-500">{error}</p>
                ) : null}
                <button
                  type="button"
                  onClick={begin}
                  disabled={pending}
                  className="mt-4 w-full rounded-full bg-accent py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Starting…" : `Send $${(amount / 100).toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
