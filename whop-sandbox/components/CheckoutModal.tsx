"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Button, Heading, Text } from "@whop/react/components";

export interface ReceiptSummary {
  id: string;
  status: string;
  substatus: string | null;
  total: number;
  currency: string;
  paidAt: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  membershipId: string | null;
}

type Phase =
  | { name: "checkout" }
  | { name: "verifying"; receiptId: string; step: number }
  | { name: "verified" }
  | { name: "error"; message: string; receiptId?: string };

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

const ERROR_COPY: Record<string, string> = {
  wrong_product: "This receipt is for a different product.",
  not_paid: "Whop says this checkout didn't complete.",
  timeout:
    "Whop is taking longer than usual to confirm this payment. Try again in a moment.",
  missing_receipt:
    "The checkout finished but we didn't get a receipt back. Check the payments page on the sandbox dashboard.",
  network: "We couldn't reach the server. Try again.",
};

// The paywall demos' proven checkout modal: embed, then a 202-polling
// verify against /api/verify, then hand the receipt summary to the panel.
export function CheckoutModal({
  open,
  onClose,
  onVerified,
  onEvent,
  planId,
  title,
  priceLabel,
  environment,
  returnUrl,
  aboveEmbed,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: (receipt: ReceiptSummary) => void;
  onEvent: (kind: string, detail: string) => void;
  planId: string;
  title: string;
  priceLabel: string;
  environment: "production" | "sandbox";
  returnUrl: string;
  aboveEmbed?: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "checkout" });
  const cancelled = useRef(false);

  useEffect(() => {
    if (open) setPhase({ name: "checkout" });
  }, [open]);

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
              `${data.receipt.id} -> ${data.receipt.status}/${data.receipt.substatus ?? ""}`,
            );
            setPhase({ name: "verified" });
            onVerified(data.receipt);
            onClose();
            return;
          }

          if (res.status === 202 || res.status === 404) {
            onEvent("payments.retrieve", `${receiptId} -> still settling, retrying`);
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

  const handleComplete = useCallback(
    (_planId: string, receiptId?: string) => {
      onEvent("embed.onComplete", receiptId ?? "(no receipt id)");
      if (!receiptId) {
        setPhase({ name: "error", message: ERROR_COPY.missing_receipt });
        return;
      }
      void verify(receiptId);
    },
    [onEvent, verify],
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
            {aboveEmbed}
            <WhopCheckoutEmbed
              key={planId}
              planId={planId}
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

        {(phase.name === "verifying" || phase.name === "verified") && (
          <div className="py-2">
            <div className="flex flex-col gap-2">
              {[
                "Asking Whop for the receipt",
                "Checking that the payment went through",
                "Saving it for the refund step",
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
