"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Shared shell for every in-app checkout in Storyline.
 * Centered card on desktop, bottom sheet on mobile. Blurred backdrop. Esc + backdrop click close.
 * Used by PlusCheckoutPopup (Part 3) and TipPopup (Part 5).
 */
export function CheckoutPopup({ title, onClose, children }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Class-based body lock — toggles batch into the next paint, avoiding the
    // forced reflow that inline `style.overflow = "hidden"` writes can trigger.
    document.body.classList.add("scroll-locked");
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("scroll-locked");
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "relative w-full sm:max-w-[480px]",
          "max-h-[90vh] sm:max-h-[85vh]",
          "bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl",
          "flex flex-col",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base sm:text-lg text-text-primary">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1 hover:bg-surface rounded-full transition-colors"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
