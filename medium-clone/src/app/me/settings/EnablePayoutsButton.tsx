"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, ShieldCheck } from "lucide-react";

export function EnablePayoutsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSandbox = process.env.NEXT_PUBLIC_WHOP_SANDBOX === "true";

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/writers/onboard", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not start payouts");
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      router.refresh();
      router.push("/me/dashboard?kyc=complete");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-5 py-2.5 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover"
      >
        Enable payouts
      </button>

      {open && (
        <ConfirmModal
          onClose={() => setOpen(false)}
          onConfirm={confirm}
          isPending={isPending}
          isSandbox={isSandbox}
          error={error}
        />
      )}
    </>
  );
}

function ConfirmModal({
  onClose,
  onConfirm,
  isPending,
  isSandbox,
  error,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isSandbox: boolean;
  error: string | null;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.classList.add("scroll-locked");
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("scroll-locked");
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enable payouts"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full sm:max-w-[460px] bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base sm:text-lg text-text-primary">Enable payouts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 hover:bg-surface rounded-full transition-colors"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
              <ShieldCheck aria-hidden="true" className="size-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary">
                {isSandbox
                  ? "Demo mode: KYC will be skipped"
                  : "You'll be redirected to Whop's hosted verification"}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {isSandbox ? (
                  <>
                    This is a sandbox demo, so we&apos;ll create your Whop sub-account and
                    auto-complete identity verification. In production, you&apos;d be sent to
                    Whop&apos;s hosted KYC flow first — government ID upload, address details,
                    typically 1-3 minutes — and payouts would only unlock after verification
                    succeeded.
                  </>
                ) : (
                  <>
                    Whop hosts the verification flow on its own domain. You&apos;ll be asked for
                    a government ID and basic personal details. Most writers complete it in 1-3
                    minutes. We&apos;ll bring you back here when you&apos;re done.
                  </>
                )}
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="px-3 py-2 rounded-md bg-error/10 text-error text-sm border border-error/30"
            >
              {error}
            </div>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-pill border border-border text-sm hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-50"
          >
            {isPending
              ? "Setting up your account…"
              : isSandbox
                ? "Skip KYC, enable payouts"
                : "Continue to Whop verification"}
          </button>
        </footer>
      </div>
    </div>
  );
}
