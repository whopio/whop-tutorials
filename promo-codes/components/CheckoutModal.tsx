"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loadWhop } from "@whop/elements";
import {
  Checkout,
  CheckoutElement,
  WhopElements,
  type CheckoutPaymentCompletion,
  type CheckoutSetupCompletion,
  type CheckoutWaitlistCompletion,
} from "@whop/elements-react";
import { Button, Heading, Text } from "@whop/react/components";
import { formatMoney } from "@/lib/money";

/** Everything the checkout tells the page when it finishes. */
export type CheckoutCompletion =
  | CheckoutPaymentCompletion
  | CheckoutWaitlistCompletion
  | CheckoutSetupCompletion;

export interface ReceiptSummary {
  id: string;
  status: string;
  /** What the plan cost before any discount, straight off the payment. */
  before: number;
  paid: number;
  saved: number;
  /** The promo_ id the payment carries, or null if no code was used. */
  promoCodeId: string | null;
  /** The code Whop says did the work, or null if none was used. */
  code: string | null;
  /** Already converted for display: "25%" or "$15.00". */
  discount: string | null;
  currency: string;
  paidAt: string | null;
  cardLast4: string | null;
}

type Phase =
  | { name: "checkout" }
  | { name: "verifying"; receiptId: string; step: number }
  | { name: "verified" }
  | { name: "error"; message: string; receiptId?: string };

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

const ERROR_COPY: Record<string, string> = {
  invalid_receipt: "That is not a payment ID this page can check.",
  wrong_product: "This receipt is for a different product.",
  not_paid: "Whop says this checkout didn't complete.",
  timeout:
    "Whop is taking longer than usual to confirm this payment. Try again in a moment.",
  missing_receipt:
    "The checkout finished but we didn't get a receipt back. Check the payments page on the sandbox dashboard.",
  network: "We couldn't reach the server. Try again.",
};

export function CheckoutModal({
  open,
  onClose,
  onVerified,
  onCompleted,
  onEvent,
  planId,
  title,
  priceLabel,
  environment,
  promoCode,
  resumeReceiptId,
  checkoutConfigurationId,
  aboveCheckout,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: (receipt: ReceiptSummary) => void;
  onCompleted: (completion: CheckoutCompletion) => void;
  onEvent: (kind: string, detail: string) => void;
  planId: string;
  title: string;
  priceLabel: string;
  environment: "production" | "sandbox";
  /** Pre-applies a code, so the buyer never sees the full price first. */
  promoCode?: string;
  /** A payment the buyer came back with. Opens straight into verifying it. */
  resumeReceiptId?: string;
  /** Mount from this checkout configuration so its redirect brings the buyer back. */
  checkoutConfigurationId?: string;
  aboveCheckout?: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "checkout" });
  const cancelled = useRef(false);

  useEffect(() => {
    // StrictMode runs the cleanup once at mount; reset on every (re)mount
    // so the flag doesn't stay stuck on true.
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
            res = await fetch("/api/verify", {
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
            const data = (await res.json()) as { receipt: ReceiptSummary };
            onEvent(
              "payments.retrieve",
              `${data.receipt.id} charged ${formatMoney(data.receipt.paid, data.receipt.currency)}`,
            );
            setPhase({ name: "verified" });
            onVerified(data.receipt);
            onClose();
            return;
          }

          if (res.status === 202 || res.status === 404) {
            onEvent("payments.retrieve", `${receiptId} still settling, retrying`);
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
    [onClose, onEvent, onVerified],
  );

  useEffect(() => {
    if (!open) return;
    if (resumeReceiptId) void verify(resumeReceiptId);
    else setPhase({ name: "checkout" });
    // Runs when the modal opens. verify is rebuilt on every parent render, and
    // re-running it here would start a second polling loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resumeReceiptId]);

  // Elements reports one of three outcomes. Only a payment has a receipt to
  // verify. A waitlist entry or a saved card would mean the plan is set up
  // differently from the one this demo sells.
  const handleComplete = useCallback(
    (completion: CheckoutCompletion) => {
      onCompleted(completion);
      if (completion.result !== "payment") {
        onEvent("Checkout.onComplete", completion.result);
        setPhase({ name: "error", message: ERROR_COPY.missing_receipt });
        return;
      }
      onEvent("Checkout.onComplete", completion.paymentId);
      void verify(completion.paymentId);
    },
    [onCompleted, onEvent, verify],
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
      {/* Wide on purpose. Below roughly 1,000px the checkout drops to one
          column and folds the promo field under "Promo code & details". */}
      <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <Heading size="4">{title}</Heading>
            <Text size="1" color="gray">
              {priceLabel}
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
            {aboveCheckout}
            <WhopElements
              elements={loadWhop()}
              environment={environment}
              appearance={{ theme: { appearance: "light", accentColor: "orange" } }}
            >
              <Checkout
                // Every option is fixed when the checkout session is minted, so
                // a different code needs a fresh mount, not new props.
                key={`${planId}:${promoCode ?? ""}`}
                // The configuration names the same plan and adds the
                // redirect. promoCode still applies on top of it.
                {...(checkoutConfigurationId
                  ? { checkoutConfiguration: checkoutConfigurationId }
                  : { plan: planId })}
                promoCode={promoCode}
                onComplete={handleComplete}
                fallback={
                  <div className="flex h-64 items-center justify-center">
                    <Text size="2" color="gray">
                      Loading secure checkout...
                    </Text>
                  </div>
                }
              >
                <CheckoutElement />
              </Checkout>
            </WhopElements>
          </div>
        )}

        {(phase.name === "verifying" || phase.name === "verified") && (
          <div className="py-2">
            <div className="flex flex-col gap-2">
              {[
                "Asking Whop for the receipt",
                "Checking what it actually charged",
                "Comparing it with the list price",
              ].map((line, i) => {
                const step = phase.name === "verified" ? 2 : phase.step;
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
                  Try again
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
          </div>
        )}
      </div>
    </div>
  );
}
