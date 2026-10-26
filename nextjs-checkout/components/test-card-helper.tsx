"use client";

import { useState } from "react";
import { Check, Copy, CreditCard } from "lucide-react";

const CARD_NUMBER = "4242 4242 4242 4242";

export function TestCardHelper() {
  const [copied, setCopied] = useState<"number" | "zip" | null>(null);

  async function copy(value: string, which: "number" | "zip") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard failed; no-op
    }
  }

  return (
    <aside className="bg-[color:var(--color-surface-alt)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] p-5 flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <CreditCard
          size={16}
          strokeWidth={1.75}
          className="text-[color:var(--color-fg-muted)]"
          aria-hidden="true"
        />
        <span className="text-xs uppercase tracking-wider font-semibold text-[color:var(--color-fg-muted)]">
          Sandbox test card
        </span>
      </header>
      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <dt className="text-xs text-[color:var(--color-fg-muted)]">
              Card number
            </dt>
            <dd className="font-mono tabular text-[color:var(--color-fg-primary)] truncate">
              {CARD_NUMBER}
            </dd>
          </div>
          <button
            type="button"
            onClick={() => copy(CARD_NUMBER.replace(/\s/g, ""), "number")}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:border-[color:var(--color-border-strong)] transition-colors"
            aria-label="Copy card number"
          >
            {copied === "number" ? (
              <>
                <Check
                  size={14}
                  strokeWidth={2}
                  className="text-[color:var(--color-accent-success)]"
                  aria-hidden="true"
                />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <dt className="text-xs text-[color:var(--color-fg-muted)]">Expiry</dt>
            <dd className="font-mono tabular">any future date</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-[color:var(--color-fg-muted)]">CVC</dt>
            <dd className="font-mono tabular">any 3 digits</dd>
          </div>
        </div>
      </dl>
      <p className="text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
        Use <span className="font-mono">4000 0000 0000 0002</span> to
        simulate a decline.
      </p>
    </aside>
  );
}
