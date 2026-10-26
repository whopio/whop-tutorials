"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";

interface CheckoutModalProps {
  /** Whop plan ID created at publish time (one-time, has application_fee_amount). */
  planId: string;
  /** Template slug — only used as a returnUrl hint when external payment methods top-frame-redirect. */
  slug: string;
  /** Server reads WHOP_SANDBOX and forwards a boolean — we don't want a NEXT_PUBLIC_ env var. */
  isSandbox: boolean;
  /** Absolute base URL (already trimmed) — Whop's returnUrl needs to be absolute. */
  appUrl: string;
  /** Button label, e.g. "Buy for $19". The trigger always renders inline; the modal is a portal. */
  buttonLabel: string;
}

/**
 * Embedded Whop checkout in a modal. No auth required — Whop handles buyer
 * identity (creates a guest Whop account on the fly, emails the receipt).
 *
 * Three states:
 *  - idle: just the trigger button on the page
 *  - open: backdrop + modal containing the embed
 *  - success: modal swaps to a confirmation panel with a deep-link to /access/[receiptId]
 *
 * The webhook (payment.succeeded) is still the source of truth for creating
 * the Purchase row. The receipt page polls our DB until that row shows up.
 */
export function CheckoutModal({
  planId,
  slug,
  isSandbox,
  appUrl,
  buttonLabel,
}: CheckoutModalProps) {
  const [open, setOpen] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portal target only exists after hydration.
  useEffect(() => setMounted(true), []);

  // Lock body scroll while modal is open. Restore on close / unmount.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes. Don't close if we're showing the success state — the buyer
  // should explicitly click through to their downloads.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !receiptId) handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, receiptId]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Don't reset receiptId — if the buyer reopens we want to stay in success.
  }, []);

  // The embed types onComplete as overloaded; we only use the planId-based
  // variant, so the receipt_id arg is what we want.
  const handleComplete = useCallback(
    (_planId: string, receipt_id?: string) => {
      if (receipt_id) setReceiptId(receipt_id);
    },
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-pointer rounded-full bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
      >
        {buttonLabel}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        Secure checkout via Whop · No account required
      </p>

      {mounted && open
        ? createPortal(
            <Backdrop onClose={receiptId ? undefined : handleClose}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkout-modal-title"
                className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                  <h2
                    id="checkout-modal-title"
                    className="font-display text-base font-semibold text-[var(--color-text-primary)]"
                  >
                    {receiptId ? "Payment confirmed" : "Checkout"}
                  </h2>
                  {!receiptId && (
                    <button
                      type="button"
                      onClick={handleClose}
                      aria-label="Close checkout"
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </header>

                {receiptId ? (
                  <SuccessPanel receiptId={receiptId} />
                ) : (
                  <div className="max-h-[70vh] overflow-y-auto">
                    <WhopCheckoutEmbed
                      planId={planId}
                      environment={isSandbox ? "sandbox" : "production"}
                      returnUrl={`${appUrl}/templates/${slug}`}
                      onComplete={handleComplete}
                      fallback={
                        <div className="grid min-h-[420px] place-items-center text-sm text-[var(--color-text-secondary)]">
                          Loading checkout…
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            </Backdrop>,
            document.body,
          )
        : null}
    </>
  );
}

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  /** When omitted, the backdrop is non-dismissable (success state). */
  onClose?: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm"
    >
      {children}
    </div>
  );
}

function SuccessPanel({ receiptId }: { receiptId: string }) {
  return (
    <div className="px-6 py-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
        Thanks for your purchase
      </h3>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Your downloads are ready. We&rsquo;ve also emailed you the receipt
        link.
      </p>
      <Link
        href={`/access/${receiptId}`}
        prefetch={false}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
      >
        Open your downloads
      </Link>
    </div>
  );
}
