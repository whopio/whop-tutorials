"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small icon-button that copies `value` to the clipboard and shows a checkmark
 * for 1.4s on success. Use inline next to a code pill or read-only value.
 */
export function CopyButton({
  value,
  className,
  label = "Copy",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard may be denied (insecure context, permissions). Fail quiet.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex items-center justify-center size-7 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors",
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden="true" className="size-3.5 text-brand" />
      ) : (
        <Copy aria-hidden="true" className="size-3.5" />
      )}
    </button>
  );
}
