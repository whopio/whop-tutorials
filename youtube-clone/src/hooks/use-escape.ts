"use client";

import { useEffect, useRef } from "react";

/**
 * Call `onEscape` when the user presses Escape, but only while `active` is true.
 * Used to dismiss popovers/dialogs (a11y: keyboard-closable overlays).
 */
export function useEscape(active: boolean, onEscape: () => void): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);
}
