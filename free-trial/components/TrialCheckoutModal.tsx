"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Button, Heading, Text } from "@whop/react/components";
import { TestCardStrip } from "@/components/TestCardStrip";
import type { DemoProduct } from "@/constants/products";

type Phase =
  | { name: "checkout" }
  | { name: "verifying"; receiptId: string; step: number }
  | { name: "unlocked" }
  | { name: "error"; message: string; receiptId?: string };

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

const ERROR_COPY: Record<string, string> = {
  wrong_product:
    "That receipt paid for a different product, so it can't start this trial.",
  not_paid:
    "Whop says this checkout didn't complete. If you were charged, sign in with Whop to restore access.",
  no_user:
    "Whop didn't attach a user to this checkout. Sign in with Whop to restore access.",
  timeout:
    "The checkout is taking longer than expected to confirm. Keep your receipt id and try again, or sign in with Whop.",
  missing_receipt:
    "The checkout finished but didn't hand back a receipt. Check your email, then sign in with Whop to restore access.",
  network: "We couldn't reach the server to verify the checkout. Try again.",
};

// The checkout popup for step 2. The embed + 202-poll verify flow are the
// paywall demo's proven machinery; on success the server re-renders into
// the trial-active step.
export function TrialCheckoutModal({
  open,
  onClose,
  product,
  environment,
  returnUrl,
}: {
  open: boolean;
  onClose: () => void;
  product: DemoProduct;
  environment: "production" | "sandbox";
  returnUrl: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "checkout" });
  const cancelled = useRef(false);

  useEffect(() => {
    if (open) setPhase({ name: "checkout" });
  }, [open]);

  useEffect(() => {
    // StrictMode runs the cleanup once at mount; reset on every (re)mount
    // so the flag doesn't stay stuck on true and swallow the refresh.
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dismissable = phase.name === "checkout" || phase.name === "error";

  const close = useCallback(() => {
    if (phase.name === "checkout" || phase.name === "error") onClose();
  }, [phase.name, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  const verify = useCallback(
    async (receiptId: string) => {
      setPhase({ name: "verifying", receiptId, step: 0 });
      const stepTimer = setTimeout(() => {
        if (!cancelled.current) {
          setPhase((p) => (p.name === "verifying" ? { ...p, step: 1 } : p));
        }
      }, 900);

      try {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          let res: Response;
          try {
            res = await fetch("/api/unlock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ receiptId }),
            });
          } catch {
            setPhase({ name: "error", message: ERROR_COPY.network, receiptId });
            return;
          }
          if (cancelled.current) return;

          if (res.ok) {
            setPhase({ name: "unlocked" });
            router.refresh();
            return;
          }

          if (res.status === 202 || res.status === 404) {
            await new Promise((resolve) => setTimeout(resolve, POLL_MS));
            continue;
          }

          const data: unknown = await res.json().catch(() => null);
          const code =
            data && typeof data === "object" && "error" in data
              ? String((data as { error: unknown }).error)
              : "network";
          setPhase({
            name: "error",
            message: ERROR_COPY[code] ?? ERROR_COPY.network,
            receiptId,
          });
          return;
        }
        setPhase({ name: "error", message: ERROR_COPY.timeout, receiptId });
      } finally {
        clearTimeout(stepTimer);
      }
    },
    [router],
  );

  const handleComplete = useCallback(
    (_planId: string, receiptId?: string) => {
      if (!receiptId) {
        setPhase({ name: "error", message: ERROR_COPY.missing_receipt });
        return;
      }
      void verify(receiptId);
    },
    [verify],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-[#151515]/50 backdrop-blur-[6px]"
        onClick={dismissable ? close : undefined}
      />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <Heading size="4">{product.name}</Heading>
            <Text size="1" color="gray">
              {product.priceLabel}
            </Text>
          </div>
          {dismissable && (
            <button
              type="button"
              onClick={close}
              aria-label="Close checkout"
              className="rounded-md px-2 py-1 text-lg leading-none text-[#151515]/50 transition hover:bg-[#151515]/5 hover:text-[#151515]"
            >
              &times;
            </button>
          )}
        </div>

        {phase.name === "checkout" && (
          <div className="flex flex-col gap-3">
            {environment === "sandbox" && <TestCardStrip />}
            <WhopCheckoutEmbed
              key={product.planId}
              planId={product.planId}
              environment={environment}
              returnUrl={returnUrl}
              theme="light"
              themeOptions={{ accentColor: "orange" }}
              onComplete={handleComplete}
              fallback={
                <div className="flex h-64 items-center justify-center">
                  <Text size="2" color="gray">
                    Loading secure checkout...
                  </Text>
                </div>
              }
            />
          </div>
        )}

        {(phase.name === "verifying" || phase.name === "unlocked") && (
          <div className="py-2">
            <div className="flex flex-col gap-2">
              {[
                "Retrieving the receipt from Whop",
                "Confirming the trial started",
                "Starting your session",
              ].map((line, i) => {
                const step = phase.name === "unlocked" ? 2 : phase.step;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Text size="2" color={i <= step ? "green" : "gray"}>
                      {i < step ? "✓" : i === step ? "•" : "○"}
                    </Text>
                    <Text size="2" color={i <= step ? undefined : "gray"}>
                      {line}
                    </Text>
                  </div>
                );
              })}
            </div>
            {phase.name === "unlocked" && (
              <div className="mt-3">
                <Text size="2" color="green">
                  Trial started. Re-rendering on the server...
                </Text>
              </div>
            )}
          </div>
        )}

        {phase.name === "error" && (
          <div className="py-2">
            <Text size="2" color="red" as="p">
              {phase.message}
            </Text>
            <div className="mt-4 flex items-center gap-3">
              {phase.receiptId && (
                <Button
                  type="button"
                  size="2"
                  onClick={() => void verify(phase.receiptId as string)}
                >
                  Retry verification
                </Button>
              )}
              <Button
                type="button"
                size="2"
                variant="soft"
                color="gray"
                onClick={() => setPhase({ name: "checkout" })}
              >
                Back to checkout
              </Button>
            </div>
            <div className="mt-3">
              <Text size="1" color="gray">
                Already started a trial?{" "}
                <a className="underline" href="/api/auth/login">
                  Sign in with Whop
                </a>{" "}
                to restore it.
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
