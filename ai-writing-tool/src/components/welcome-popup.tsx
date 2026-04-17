"use client";

import { useEffect, useState } from "react";

const DISPLAY_MS = 5000;

const PRO_FEATURES = [
  "All 8 writing templates unlocked",
  "Unlimited generations per day",
  "Chat-based content refinement",
  "Generation history saved",
];

export function WelcomePopup({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DISPLAY_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl sm:mx-auto sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-text-primary">
            Welcome to Pro!
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Your account has been upgraded. Here&apos;s what you can do now:
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3 text-sm text-text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
              {f}
            </div>
          ))}
        </div>

        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-surface-hover">
          <div
            className="h-full rounded-full bg-accent transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
