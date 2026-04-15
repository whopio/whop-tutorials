"use client";

import { useApp } from "./app-shell";

export function LimitModal() {
  const { closeLimitModal } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeLimitModal}
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-2xl">
        <button
          onClick={closeLimitModal}
          className="absolute right-3 top-3 rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            Demo limit reached
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            This is a demo application. The daily generation limit has been reached. Limits reset at midnight UTC.
          </p>
        </div>

        <button
          onClick={closeLimitModal}
          className="mt-6 w-full rounded-lg bg-surface-hover px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
