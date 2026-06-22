"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Button, Heading, Text } from "@whop/react/components";
import { StepAnchor } from "@/components/StepAnchor";
import { TestCardStrip } from "@/components/TestCardStrip";

export interface TierOption {
  key: string;
  label: string;
  description: string;
  planId: string;
}

interface PaywallCardProps {
  options: TierOption[];
  /** The subscription option the header's "Go Pro" badge opens. */
  proOption?: TierOption;
  environment: "production" | "sandbox";
  returnUrl: string;
}

type Phase =
  | { name: "idle" }
  | { name: "checkout"; option: TierOption }
  | { name: "verifying"; option: TierOption; receiptId: string; step: number }
  | { name: "unlocked"; option: TierOption }
  | { name: "error"; option: TierOption; message: string; receiptId?: string };

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

const ERROR_COPY: Record<string, string> = {
  wrong_product: "That receipt paid for a different product, so it can't unlock this post.",
  not_paid: "Whop says this payment didn't complete. If you were charged, sign in with Whop to restore access.",
  no_user: "Whop didn't attach a buyer to this payment. Sign in with Whop to restore access.",
  timeout: "The payment is taking longer than expected to confirm. Keep your receipt id and try again, or sign in with Whop.",
  missing_receipt: "The checkout finished but didn't hand back a receipt. Check your email for the receipt, then sign in with Whop to restore access.",
  network: "We couldn't reach the server to verify the receipt. Try again.",
};

export function PaywallCard({
  options,
  proOption,
  environment,
  returnUrl,
}: PaywallCardProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const cancelled = useRef(false);

  // The header's Pro badge morphs into a "Go Pro" button; clicking it
  // opens this card's modal with the subscription plan.
  useEffect(() => {
    const handler = () => {
      const option =
        proOption ?? options.find((o) => o.key === "pro") ?? options[0];
      if (option) setPhase({ name: "checkout", option });
    };
    window.addEventListener("pulse:open-pro-checkout", handler);
    return () =>
      window.removeEventListener("pulse:open-pro-checkout", handler);
  }, [options, proOption]);

  useEffect(() => {
    // Reset on every (re)mount: StrictMode's simulated unmount in dev
    // runs the cleanup once at mount, which would otherwise leave the
    // flag stuck on true and silently swallow the unlock refresh.
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const modalOpen = phase.name !== "idle";

  // Lock body scroll while the checkout modal is open.
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  const dismissable = phase.name === "checkout" || phase.name === "error";

  const close = useCallback(() => {
    setPhase((p) =>
      p.name === "checkout" || p.name === "error" ? { name: "idle" } : p,
    );
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen, close]);

  const verify = useCallback(
    async (option: TierOption, receiptId: string) => {
      setPhase({ name: "verifying", option, receiptId, step: 0 });
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
            setPhase({
              name: "error",
              option,
              message: ERROR_COPY.network,
              receiptId,
            });
            return;
          }
          if (cancelled.current) return;

          if (res.ok) {
            setPhase({ name: "unlocked", option });
            router.refresh();
            return;
          }

          // 202 = payment still pending, 404 = payment not readable yet.
          // Both clear up within seconds; anything else is a real error.
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
            option,
            message: ERROR_COPY[code] ?? ERROR_COPY.network,
            receiptId,
          });
          return;
        }
        setPhase({
          name: "error",
          option,
          message: ERROR_COPY.timeout,
          receiptId,
        });
      } finally {
        clearTimeout(stepTimer);
      }
    },
    [router],
  );

  const handleComplete = useCallback(
    (option: TierOption) => (_planId: string, receiptId?: string) => {
      if (!receiptId) {
        setPhase({ name: "error", option, message: ERROR_COPY.missing_receipt });
        return;
      }
      void verify(option, receiptId);
    },
    [verify],
  );

  return (
    <>
      {/* The paywall card: placeholder shapes (deliberately NOT the real
          post blurred - the gated content never enters the DOM) with the
          offer and unlock CTA in the overlay. The checkout only appears
          after a click. */}
      <div className="relative overflow-hidden rounded-xl border border-[#E5E4E0] bg-white">
        <div aria-hidden className="px-6 py-5 blur-[6px]">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-11/12 rounded bg-[#B6B5B0]/50" />
            <div className="h-3 w-full rounded bg-[#B6B5B0]/40" />
            <div className="h-3 w-9/12 rounded bg-[#B6B5B0]/45" />
          </div>
          <svg
            viewBox="0 0 400 110"
            className="mt-4 h-28 w-full"
            preserveAspectRatio="none"
          >
            {[12, 52, 92, 132, 172, 212, 252, 292, 332, 372].map((x, i) => {
              const heights = [38, 56, 44, 70, 62, 84, 58, 92, 74, 98];
              return (
                <rect
                  key={x}
                  x={x - 11}
                  y={104 - heights[i]}
                  width={26}
                  height={heights[i]}
                  rx={4}
                  fill="#B6B5B0"
                  opacity={0.45}
                />
              );
            })}
          </svg>
          <div className="mt-4 flex flex-col gap-2">
            <div className="h-3 w-10/12 rounded bg-[#B6B5B0]/40" />
            <div className="h-3 w-7/12 rounded bg-[#B6B5B0]/45" />
          </div>
        </div>

        <div className="absolute inset-0 bg-white/45" />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          {/* The Pro badge IS the unlock CTA: it widens into the button
              on hover and opens the checkout modal on click. */}
          {options[0] && (
            <StepAnchor id="unlock">
              <button
                type="button"
                onClick={() =>
                  setPhase({ name: "checkout", option: options[0] })
                }
                className={[
                  "group relative h-9 overflow-hidden rounded-full bg-[#FA4616] text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[#e03e10] hover:shadow-md",
                  options[0].key === "pro"
                    ? "w-[76px] hover:w-[100px]"
                    : "w-[76px] hover:w-[136px]",
                ].join(" ")}
              >
                <span className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-100 transition-opacity duration-200 group-hover:opacity-0">
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
                  </svg>
                  Pro
                </span>
                <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {options[0].key === "pro" ? "Go Pro" : "Unlock now"}
                </span>
              </button>
            </StepAnchor>
          )}
          <Text size="2" color="gray">
            The rest of this post is for members.
          </Text>
          {options[0] && (
            <Text size="1" color="gray">
              {options[0].description}
            </Text>
          )}
          {options.slice(1).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPhase({ name: "checkout", option })}
              className="text-xs font-medium text-[#D13415] underline-offset-2 hover:underline"
            >
              or {option.label}: {option.description}
            </button>
          ))}
        </div>
      </div>

      {/* Checkout modal: blurs the page behind it. */}
      {modalOpen && (
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
                <Heading size="4">{phase.option.label}</Heading>
                <Text size="1" color="gray">
                  {phase.option.description}
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
                  key={phase.option.planId}
                  planId={phase.option.planId}
                  environment={environment}
                  returnUrl={returnUrl}
                  theme="light"
                  themeOptions={{ accentColor: "orange" }}
                  onComplete={handleComplete(phase.option)}
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
                    "Confirming it paid for this content",
                    "Starting your session",
                  ].map((line, i) => {
                    const step =
                      phase.name === "unlocked" ? 2 : phase.step;
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
                      Access granted. Re-rendering on the server...
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
                      onClick={() =>
                        void verify(
                          phase.option,
                          phase.receiptId as string,
                        )
                      }
                    >
                      Retry verification
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="2"
                    variant="soft"
                    color="gray"
                    onClick={() =>
                      setPhase({ name: "checkout", option: phase.option })
                    }
                  >
                    Back to checkout
                  </Button>
                </div>
                <div className="mt-3">
                  <Text size="1" color="gray">
                    Already paid?{" "}
                    <a className="underline" href="/api/auth/login">
                      Sign in with Whop
                    </a>{" "}
                    to restore access on any device.
                  </Text>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
