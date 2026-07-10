"use client";

import { useEffect, useRef } from "react";
import { recordWatchProgress } from "@/lib/history-actions";

/**
 * WATCH-1 + LIB-1/2: the HTML5 player that also resumes from the saved position
 * and reports progress (throttled, plus on pause/ended/unmount) so watch history
 * and resume work. Progress reporting is a no-op for signed-out viewers.
 */
export function WatchPlayer({
  videoId,
  src,
  poster,
  resumeAt,
  isSignedIn,
}: {
  videoId: string;
  src: string;
  poster?: string;
  resumeAt: number;
  isSignedIn: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (resumeAt > 0) {
      const seek = () => {
        try {
          video.currentTime = resumeAt;
        } catch {
          // ignore if not seekable yet
        }
      };
      if (video.readyState >= 1) seek();
      else video.addEventListener("loadedmetadata", seek, { once: true });
    }

    if (!isSignedIn) return;

    const send = () => {
      const pos = Math.floor(video.currentTime || 0);
      const dur = Math.floor(video.duration || 0);
      recordWatchProgress(videoId, pos, dur).catch(() => {});
    };
    const onTime = () => {
      const now = Date.now();
      if (now - lastSent.current > 5000) {
        lastSent.current = now;
        send();
      }
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", send);
    video.addEventListener("ended", send);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", send);
      video.removeEventListener("ended", send);
      send();
    };
  }, [videoId, resumeAt, isSignedIn]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={ref}
      src={src}
      poster={poster}
      controls
      playsInline
      className="aspect-video max-h-[80vh] w-full"
    />
  );
}
