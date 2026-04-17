"use client";

import { useApp } from "./app-shell";

export function UpgradeModal() {
  const { closeUpgradeModal, openCheckoutPopup } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeUpgradeModal}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-2xl">
        <button
          onClick={closeUpgradeModal}
          className="absolute right-3 top-3 rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <div className="text-center">
          <span className="inline-block rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent">
            Pro
          </span>
          <h2 className="mt-3 text-xl font-semibold text-text-primary">
            Unlock the full studio
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Get access to all 8 templates and unlimited generations.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
            All 8 writing templates
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
            Unlimited generations per day
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
            Chat-based content refinement
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
            Generation history saved
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-3xl font-bold text-text-primary">
            $20<span className="text-sm font-normal text-text-tertiary">/mo</span>
          </p>
        </div>

        <button
          onClick={() => {
            closeUpgradeModal();
            openCheckoutPopup();
          }}
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
        >
          Upgrade now
        </button>
      </div>
    </div>
  );
}
