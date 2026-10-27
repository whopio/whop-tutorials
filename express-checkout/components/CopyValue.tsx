"use client";

import { useState } from "react";

function CopyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5.25" y="5.25" width="8" height="8" rx="1.75" />
      <path d="M10.75 5.25V3.5a1.75 1.75 0 0 0-1.75-1.75H3.5A1.75 1.75 0 0 0 1.75 3.5V9a1.75 1.75 0 0 0 1.75 1.75h1.75" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 8.5l3.25 3.25L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// One copyable value: a tinted chip you can click, and an icon button in a
// fixed column so every row's button lines up.
export function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <div className="flex min-w-0 flex-col items-start gap-1">
        <button
          type="button"
          onClick={copy}
          title="Copy"
          className="max-w-full truncate rounded-md bg-[#ECEAE4] px-2 py-1 text-left font-mono text-[13px] tracking-[0.02em] text-[#151515] transition hover:bg-[#E2DFD8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]"
        >
          {value}
        </button>
        <span className="text-[12px] leading-snug text-[#151515]/60">{label}</span>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`${copied ? "Copied" : "Copy"} ${value}`}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515] ${
          copied ? "bg-[#1E9E6A]/12 text-[#137049]" : "bg-[#ECEAE4] text-[#151515]/70 hover:bg-[#E2DFD8] hover:text-[#151515]"
        }`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}
