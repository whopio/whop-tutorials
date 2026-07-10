"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, BellRing, Check, ChevronDown } from "lucide-react";
import {
  setNotifyLevel,
  toggleSubscribe,
} from "@/lib/social-actions";
import type { NotifyLevel } from "@/generated/prisma/client";
import { useEscape } from "@/hooks/use-escape";

function goSignIn() {
  window.location.href = `/sign-in?next=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
}

const LEVELS: { value: NotifyLevel; label: string; icon: typeof Bell }[] = [
  { value: "ALL", label: "All", icon: BellRing },
  { value: "PERSONALIZED", label: "Personalized", icon: Bell },
  { value: "NONE", label: "None", icon: BellOff },
];

/**
 * SOCIAL-1 / WATCH-4 / NOTIFY-1: free one-click subscribe with an optimistic
 * toggle, plus the notification bell (All / Personalized / None) once
 * subscribed. Hidden on the viewer's own channel.
 */
export function SubscribeButton({
  channelId,
  isOwner,
  isSignedIn,
  initialSubscribed,
  initialNotify,
}: {
  channelId: string;
  isOwner: boolean;
  isSignedIn: boolean;
  initialSubscribed: boolean;
  initialNotify?: NotifyLevel | null;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [notify, setNotify] = useState<NotifyLevel>(initialNotify ?? "ALL");
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEscape(open, () => setOpen(false));

  if (isOwner) return null;

  function subscribe() {
    if (!isSignedIn) return goSignIn();
    setSubscribed(true);
    setNotify("ALL");
    startTransition(async () => {
      const res = await toggleSubscribe(channelId);
      if ("error" in res) setSubscribed(false);
      else setSubscribed(res.subscribed);
    });
  }

  function unsubscribe() {
    setOpen(false);
    setSubscribed(false);
    startTransition(async () => {
      const res = await toggleSubscribe(channelId);
      if ("error" in res) setSubscribed(true);
      else setSubscribed(res.subscribed);
    });
  }

  function choose(level: NotifyLevel) {
    setNotify(level);
    setOpen(false);
    startTransition(async () => {
      await setNotifyLevel(channelId, level);
    });
  }

  if (!subscribed) {
    return (
      <button
        type="button"
        onClick={subscribe}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
      >
        Subscribe
      </button>
    );
  }

  const BellIcon =
    notify === "ALL" ? BellRing : notify === "NONE" ? BellOff : Bell;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full bg-chip px-4 py-2 text-sm font-medium hover:bg-hover-strong"
      >
        <BellIcon className="h-4 w-4" />
        Subscribed
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-lg">
            {LEVELS.map((l) => {
              const Icon = l.icon;
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => choose(l.value)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-hover"
                >
                  <Icon className="h-4 w-4" />
                  {l.label}
                  {notify === l.value ? (
                    <Check className="ml-auto h-4 w-4" />
                  ) : null}
                </button>
              );
            })}
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={unsubscribe}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-hover"
            >
              Unsubscribe
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
