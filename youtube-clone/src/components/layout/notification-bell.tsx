"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";
import { useEscape } from "@/hooks/use-escape";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

/** NOTIFY-5/6: the top-bar notification inbox + unread badge. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const fetched = useRef(false);

  useEscape(open, () => setOpen(false));

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // ignore — bell just shows no badge
    }
  }

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    load();
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      try {
        await fetch("/api/notifications", { method: "POST" });
      } catch {
        // best-effort
      }
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={toggle}
        className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-hover"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-[55]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-[60] mt-1 max-h-[70vh] w-80 overflow-auto rounded-xl border border-border bg-surface shadow-lg">
            <h3 className="border-b border-border px-4 py-3 font-medium">
              Notifications
            </h3>
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-muted">
                No notifications yet.
              </p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "border-b border-border px-4 py-3 text-sm last:border-0",
                      !n.readAt && "bg-accent/5",
                    )}
                  >
                    <p className="font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 text-fg-muted">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-fg-muted">
                      {formatTimeAgo(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
