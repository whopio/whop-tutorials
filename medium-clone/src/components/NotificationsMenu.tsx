"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Heart, UserPlus, Coins, Wallet, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "LIKE" | "FOLLOWED" | "TIP_RECEIVED" | "PAYOUT_SENT" | "PLUS_RENEWED";
  read: boolean;
  createdAt: string;
  href: string | null;
  body: string;
}

const ICONS = {
  LIKE: Heart,
  FOLLOWED: UserPlus,
  TIP_RECEIVED: Coins,
  PAYOUT_SENT: Wallet,
  PLUS_RENEWED: Star,
} as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationsMenu({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-outside + escape close
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Fetch + mark-read on open. The async-function-in-effect pattern keeps
  // the setStates outside the synchronous effect body — required for React
  // 19's `react-hooks/set-state-in-effect` rule.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    async function load(signal: AbortSignal) {
      setLoading(true);
      try {
        const r = await fetch("/api/notifications", { signal });
        if (signal.aborted) return;
        const data = (await r.json()) as { items: NotificationItem[]; unread: number };
        if (signal.aborted) return;
        setItems(data.items);
        setUnread(0);
        if (data.unread > 0) {
          void fetch("/api/notifications/mark-read", { method: "POST" }).catch(() => {});
        }
      } catch {
        // Aborted or network error — leave items as-is.
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    void load(controller.signal);
    return () => controller.abort();
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative size-9 rounded-full hover:bg-surface inline-flex items-center justify-center text-text-secondary hover:text-text-primary"
      >
        <Bell aria-hidden="true" className="size-[18px]" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-semibold flex items-center justify-center"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <div
        role="menu"
        aria-label="Notifications"
        className={cn(
          "absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-md border border-border bg-background shadow-lg origin-top-right transition-all overflow-hidden",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
        )}
      >
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Notifications</h2>
        </header>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && !items && (
            <div className="px-4 py-8 text-center text-sm text-text-secondary">Loading…</div>
          )}
          {items && items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-secondary">
              No notifications yet.
            </div>
          )}
          {items && items.length > 0 && (
            <ul>
              {items.map((n) => {
                const Icon = ICONS[n.type];
                const inner = (
                  <li
                    role="menuitem"
                    className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface/50 transition-colors cursor-pointer"
                  >
                    <div className="size-8 rounded-full bg-surface flex items-center justify-center text-text-secondary shrink-0">
                      <Icon aria-hidden="true" className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="text-text-primary leading-snug">{n.body}</div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  </li>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
