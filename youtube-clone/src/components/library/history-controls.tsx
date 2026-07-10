"use client";

import { useState, useTransition } from "react";
import { Trash2, Pause, Play } from "lucide-react";
import { clearHistory, setHistoryPaused } from "@/lib/history-actions";

/** LIB-5/6: pause/resume and clear-all controls for the History page. */
export function HistoryControls({
  initialPaused,
  hasHistory,
}: {
  initialPaused: boolean;
  hasHistory: boolean;
}) {
  const [paused, setPaused] = useState(initialPaused);
  const [, startTransition] = useTransition();

  function togglePause() {
    const next = !paused;
    setPaused(next);
    startTransition(async () => {
      const res = await setHistoryPaused(next);
      if ("error" in res) setPaused(!next);
    });
  }

  function onClear() {
    if (!confirm("Clear all watch history? This can't be undone.")) return;
    startTransition(async () => {
      await clearHistory();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {hasHistory ? (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium hover:bg-hover"
        >
          <Trash2 className="h-5 w-5" />
          Clear all watch history
        </button>
      ) : null}
      <button
        type="button"
        onClick={togglePause}
        className="flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium hover:bg-hover"
      >
        {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        {paused ? "Turn on watch history" : "Pause watch history"}
      </button>
    </div>
  );
}
