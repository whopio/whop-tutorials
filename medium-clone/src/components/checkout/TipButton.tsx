"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { TipPopup } from "./TipPopup";

interface Props {
  storyId: string;
  writerName: string;
  authenticated: boolean;
  tippingEnabled: boolean;
}

export function TipButton({ storyId, writerName, authenticated, tippingEnabled }: Props) {
  const [open, setOpen] = useState(false);

  if (!tippingEnabled) return null;

  function onClick() {
    if (!authenticated) {
      window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors"
      >
        <Coins aria-hidden="true" className="size-3.5" /> Tip
      </button>
      <TipPopup
        open={open}
        onClose={() => setOpen(false)}
        storyId={storyId}
        writerName={writerName}
      />
    </>
  );
}
