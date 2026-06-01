"use client";

import { useEffect, useRef } from "react";

const DWELL_MS = 30_000; // 30 seconds — filters bounces from genuine reads

/**
 * Fires a Plus-on-Plus read event once after the reader has dwelled on the
 * story for at least 30s. Sends elapsed dwell so the API can record a quality
 * signal alongside the read.
 */
export function TrackRead({ storyId }: { storyId: string }) {
  const fired = useRef(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    const id = window.setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      const dwellSeconds = startedAt.current
        ? Math.round((Date.now() - startedAt.current) / 1000)
        : Math.round(DWELL_MS / 1000);
      void fetch(`/api/stories/${storyId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dwellSeconds }),
        keepalive: true,
      }).catch(() => {});
    }, DWELL_MS);

    return () => window.clearTimeout(id);
  }, [storyId]);

  return null;
}
