"use client";

import { useState } from "react";
import { Markdown } from "./markdown";

export function GenerationOutput({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
        <span className="text-xs font-medium text-text-muted">
          Generated content
        </span>
        <button
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3 text-sm text-text-secondary">
        <Markdown content={content} />
      </div>
    </div>
  );
}
