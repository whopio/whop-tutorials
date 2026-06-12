"use client";

import { useEffect, useState } from "react";
import { Share, Link as LinkIcon, Check, X } from "@/components/Icons";

export default function ShareButton({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-pill btn-accent flex w-full items-center justify-center gap-2"
      >
        <Share className="h-4 w-4" /> Share
      </button>
      {open ? <ShareDialog username={username} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareDialog({ username, onClose }: { username: string; onClose: () => void }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

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

  async function nativeShare() {
    if (!url) return;
    try {
      await navigator.share({ title: "Cuppa", text: "Support me on Cuppa", url });
    } catch {
      /* dismissed */
    }
  }

  const enc = encodeURIComponent(url);
  const text = encodeURIComponent("Support me on Cuppa");
  const socials = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${text}&url=${enc}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${enc}` },
    { label: "Email", href: `mailto:?subject=${text}&body=${enc}` },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="kofi-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">Share your page</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">Share this link anywhere to bring in supporters.</p>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-muted">cuppa.com/{username}</span>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-2"
          >
            {copied ? <Check className="h-4 w-4 text-positive" /> : <LinkIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {socials.map((s) => (
            <a
              key={s.label}
              href={url ? s.href : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line px-3 py-2 text-center text-sm font-semibold transition hover:bg-surface-2"
            >
              {s.label}
            </a>
          ))}
        </div>

        {canShare ? (
          <button type="button" onClick={nativeShare} className="btn-pill btn-secondary mt-3 w-full">
            More sharing options
          </button>
        ) : null}
      </div>
    </div>
  );
}
