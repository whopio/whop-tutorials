"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";

export function CheckoutPopup({
  planId,
  environment,
  onClose,
  onComplete,
}: {
  planId: string;
  environment: "sandbox" | "production";
  onClose: () => void;
  onComplete: () => void;
}) {
  const theme = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark" as const
    : "light" as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full rounded-t-xl border border-border bg-surface shadow-2xl overflow-hidden sm:mx-auto sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-sm font-semibold text-text-primary sm:text-base">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="min-h-[400px] max-h-[80vh] overflow-y-auto">
          <WhopCheckoutEmbed
            planId={planId}
            environment={environment}
            theme={theme}
            skipRedirect
            onComplete={() => onComplete()}
          />
        </div>
      </div>
    </div>
  );
}
