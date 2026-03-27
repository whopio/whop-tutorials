"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";

export function VideoPlayer({
  playbackId,
  lessonId,
  isEnrolled,
}: {
  playbackId: string;
  lessonId?: string;
  isEnrolled?: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/playback/${playbackId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.token) setToken(data.token);
      })
      .catch(console.error);
  }, [playbackId]);

  const handleEnded = useCallback(async () => {
    if (!lessonId || !isEnrolled) return;
    try {
      await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      router.refresh();
    } catch {
      // Non-blocking
    }
  }, [lessonId, isEnrolled, router]);

  if (!token) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MuxPlayer
      playbackId={playbackId}
      tokens={{ playback: token }}
      accentColor="#14B8A6"
      className="w-full aspect-video"
      onEnded={handleEnded}
    />
  );
}
