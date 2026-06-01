"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { cn } from "@/lib/utils";
import { CheckoutPopup } from "./CheckoutPopup";

interface Props {
  open: boolean;
  onClose: () => void;
  storyId: string;
  writerName: string;
}

type CheckoutEnvironment = "sandbox" | "production";

interface CheckoutSession {
  sessionId: string;
  planId: string;
  environment: CheckoutEnvironment;
  returnUrl: string;
}

const PRESETS_CENTS = [100, 300, 500, 1000];
const FEE_PCT = Number(process.env.NEXT_PUBLIC_TIP_PLATFORM_FEE_PERCENT ?? "10");

function format(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function TipPopup({ open, onClose, storyId, writerName }: Props) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [amountCents, setAmountCents] = useState<number>(300);
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const validAmount = amountCents >= 100 && amountCents <= 50_000;

  async function startTip() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = (await res.json()) as Partial<CheckoutSession> & { error?: string };
      if (!res.ok || !data.sessionId || !data.planId || !data.environment || !data.returnUrl) {
        setError(data.error ?? "Could not start tip");
        return;
      }
      setCheckout({
        sessionId: data.sessionId,
        planId: data.planId,
        environment: data.environment,
        returnUrl: data.returnUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start tip");
    } finally {
      setSubmitting(false);
    }
  }

  const title = checkout ? `Tip ${format(amountCents)}` : `Tip ${writerName}`;

  return (
    <CheckoutPopup title={title} onClose={onClose}>
      {!checkout ? (
        <div className="p-6">
          <p className="text-sm text-text-secondary">
            Pick an amount, or enter your own.
          </p>

          <div className="mt-4 flex gap-2 flex-wrap">
            {PRESETS_CENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmountCents(p)}
                aria-pressed={amountCents === p}
                className={cn(
                  "px-3 py-1.5 rounded-pill border text-sm transition-colors",
                  amountCents === p
                    ? "bg-text-primary text-background border-text-primary"
                    : "border-border text-text-secondary hover:border-text-primary hover:text-text-primary",
                )}
              >
                {format(p)}
              </button>
            ))}
          </div>

          <label className="block mt-5">
            <span className="text-sm font-medium text-text-secondary">Custom amount</span>
            <div className="mt-1 flex items-center border-b border-border focus-within:border-text-primary">
              <span className="text-[28px] font-bold mr-1">$</span>
              <input
                type="number"
                min="1"
                max="500"
                step="0.01"
                value={(amountCents / 100).toFixed(2)}
                onChange={(e) =>
                  setAmountCents(Math.round(Math.max(0, Number(e.target.value)) * 100))
                }
                className="w-full font-bold text-[28px] bg-transparent text-text-primary focus:outline-none"
                aria-label="Tip amount in dollars"
              />
            </div>
          </label>

          {error && (
            <div
              role="alert"
              className="mt-4 px-3 py-2 rounded-md bg-error/10 text-error text-sm border border-error/30"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={startTip}
            disabled={!validAmount || submitting}
            className="mt-6 w-full inline-flex items-center justify-center px-5 py-3 rounded-pill bg-brand text-white font-medium hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? "Preparing checkout…" : `Tip ${format(amountCents)}`}
          </button>

          <p className="mt-3 text-center text-xs text-text-tertiary">
            Storyline takes a {FEE_PCT}% fee. The rest goes directly to {writerName}&apos;s Whop account.
          </p>
        </div>
      ) : (
        <WhopCheckoutEmbed
          planId={checkout.planId}
          sessionId={checkout.sessionId}
          returnUrl={checkout.returnUrl}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          themeOptions={{ accentColor: "green" }}
          environment={checkout.environment}
          hidePrice
          styles={{ container: { paddingX: 16, paddingY: 8 } }}
          fallback={
            <div className="p-12 text-center text-text-secondary">Loading checkout…</div>
          }
          onComplete={() => {
            onClose();
            router.refresh();
          }}
        />
      )}
    </CheckoutPopup>
  );
}
