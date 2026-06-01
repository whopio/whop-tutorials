"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

interface Props {
  title: string;
  /** Optional path override — defaults to current URL when omitted. */
  href?: string;
}

/**
 * Share affordance for the article page. Sits to the left of the Tip button.
 *
 * Behavior, in order:
 *   1. Prefer the native Web Share sheet on supported browsers (mobile,
 *      newer desktop Safari/Chrome). Cleanest UX — no popup we'd have to
 *      style.
 *   2. Fall back to copying the URL to the clipboard, with a 1.4s success
 *      checkmark so the user has confirmation the action worked.
 *
 * Styling: outlined neutral pill so it visually defers to the brand-green
 * Tip button (which stays the loudest CTA on the page).
 */
export function ShareButton({ title, href }: Props) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const url = href ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!url) return;

    // Native share sheet (mobile + newer desktop browsers).
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled — silently move on. AbortError is the common case.
      }
    }

    // Clipboard fallback.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard denied (insecure context / permissions). Fail quiet.
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Link copied" : "Share story"}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm font-medium border border-border text-text-secondary hover:border-text-primary hover:text-text-primary transition-colors"
    >
      {copied ? (
        <>
          <Check aria-hidden="true" className="size-3.5 text-brand" />
          Copied
        </>
      ) : (
        <>
          <Share2 aria-hidden="true" className="size-3.5" />
          Share
        </>
      )}
    </button>
  );
}
