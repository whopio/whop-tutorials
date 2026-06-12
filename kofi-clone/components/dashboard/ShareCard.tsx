"use client";

import { useEffect, useState } from "react";
import { Link as LinkIcon, Check } from "@/components/Icons";

export default function ShareCard({ username }: { username: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const url = origin ? `${origin}/${username}` : "";

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const enc = encodeURIComponent(url);
  const xShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent("Support me on Cuppa")}&url=${enc}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${enc}`;

  return (
    <section className="kofi-card flex flex-col p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Share your link</h2>
      <p className="mt-2 text-sm text-muted">
        Add this link to your social bios and share it with followers. Creators who share regularly
        earn more.
      </p>
      <div className="mt-3 flex items-center rounded-xl border border-line bg-surface px-3 py-2 text-sm">
        <span className="truncate text-muted">cuppa.com/{username}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-2"
        >
          {copied ? <Check className="h-4 w-4 text-positive" /> : <LinkIcon className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a
          href={url ? xShare : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-sm font-bold transition hover:bg-surface-2"
        >
          X
        </a>
        <a
          href={url ? fbShare : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-sm font-bold transition hover:bg-surface-2"
        >
          f
        </a>
      </div>
    </section>
  );
}
