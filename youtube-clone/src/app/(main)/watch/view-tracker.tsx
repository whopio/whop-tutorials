"use client";

import { useEffect, useRef } from "react";
import { recordView } from "./actions";

/** Fires the WATCH-3 view-count action once per video, including when the
 * viewer navigates from one watch page straight to another. */
export function ViewTracker({ videoId }: { videoId: string }) {
  const lastRecorded = useRef<string | null>(null);
  useEffect(() => {
    if (lastRecorded.current === videoId) return;
    lastRecorded.current = videoId;
    recordView(videoId).catch(() => {});
  }, [videoId]);
  return null;
}
