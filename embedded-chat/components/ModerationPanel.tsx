"use client";

import { useEffect, useState } from "react";
import { Text } from "@whop/react/components";

export type ModerationSettings = {
  who_can_post: string;
  who_can_react: string;
  ban_media: boolean;
  ban_urls: boolean;
  user_posts_cooldown_seconds: number;
  banned_words: string[];
};

// Live moderation of the General channel via /api/moderation (company key).
export function ModerationPanel({
  onChange,
  onActivity,
}: {
  onChange?: (s: ModerationSettings) => void;
  onActivity?: (e: { kind: string; detail: string }) => void;
}) {
  const [s, setS] = useState<ModerationSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/moderation")
      .then((r) => r.json())
      .then((d) => {
        setS(d);
        onChange?.(d);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = async (patch: Partial<ModerationSettings>, label: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const d = await res.json();
      setS(d);
      onChange?.(d);
      onActivity?.({ kind: "moderation", detail: label });
    } catch {
      // Transient failure: keep the current settings; the toggles re-enable.
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await fetch("/api/reset", { method: "POST" });
      const res = await fetch("/api/moderation");
      if (!res.ok) return;
      const d = await res.json();
      setS(d);
      onChange?.(d);
      onActivity?.({ kind: "moderation", detail: "General reset to open" });
    } catch {
      // Transient failure: keep the current settings; the button re-enables.
    } finally {
      setBusy(false);
    }
  };

  if (!s) {
    return (
      <Text size="1" color="gray">
        Loading moderation...
      </Text>
    );
  }

  const readOnly = s.who_can_post === "admins";
  const slow = (s.user_posts_cooldown_seconds ?? 0) > 0;

  return (
    <div className="flex flex-col gap-2">
      <Toggle
        label="Read-only (admins post only)"
        on={readOnly}
        busy={busy}
        onClick={() =>
          apply(
            { who_can_post: readOnly ? "everyone" : "admins" },
            readOnly ? "General: everyone can post" : "General: read-only",
          )
        }
      />
      <Toggle
        label="Slow mode (10s cooldown)"
        on={slow}
        busy={busy}
        onClick={() =>
          apply(
            { user_posts_cooldown_seconds: slow ? 0 : 10 },
            slow ? "General: slow mode off" : "General: slow mode 10s",
          )
        }
      />
      <Toggle
        label="Block media uploads"
        on={s.ban_media}
        busy={busy}
        onClick={() =>
          apply(
            { ban_media: !s.ban_media },
            `General: media ${s.ban_media ? "allowed" : "blocked"}`,
          )
        }
      />
      <Toggle
        label="Block links"
        on={s.ban_urls}
        busy={busy}
        onClick={() =>
          apply(
            { ban_urls: !s.ban_urls },
            `General: links ${s.ban_urls ? "allowed" : "blocked"}`,
          )
        }
      />
      <button
        type="button"
        disabled={busy}
        onClick={reset}
        className="mt-1 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-[#D13415] transition hover:bg-[#FA4616]/10 disabled:opacity-50"
      >
        Reset to open
      </button>
    </div>
  );
}

function Toggle({
  label,
  on,
  busy,
  onClick,
}: {
  label: string;
  on: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E4E0] bg-white px-3 py-2 text-left text-sm transition hover:border-[#151515]/20 disabled:opacity-50"
    >
      <span>{label}</span>
      <span
        className={[
          "relative h-5 w-9 shrink-0 rounded-full transition",
          on ? "bg-[#FA4616]" : "bg-[#D9D8D4]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            on ? "left-[18px]" : "left-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
