"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationBellProps {
  userId?: string;
}

const TYPE_ICONS: Record<string, string> = {
  BID_MATCHED: "M",
  ASK_MATCHED: "S",
  TRADE_COMPLETED: "T",
  ITEM_SHIPPED: "P",
  ITEM_VERIFIED: "V",
  ITEM_FAILED: "!",
  PRICE_ALERT: "$",
  SYSTEM: "i",
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(userId);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 card shadow-xl shadow-black/30 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-200">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const meta = notif.metadata as Record<string, unknown> | null;
                const tradeId = meta?.tradeId as string | undefined;

                return (
                <button
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (tradeId) {
                      setIsOpen(false);
                      router.push(`/trades/${tradeId}`);
                    }
                  }}
                  className={`w-full text-left p-3 flex gap-3 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 ${
                    notif.read ? "opacity-60" : ""
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      notif.read
                        ? "bg-gray-800 text-gray-500"
                        : "bg-brand-600/20 text-brand-400"
                    }`}
                  >
                    {TYPE_ICONS[notif.type] || "N"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${
                        notif.read
                          ? "text-gray-400"
                          : "text-gray-200 font-medium"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="flex-shrink-0 w-2 h-2 bg-brand-500 rounded-full mt-2" />
                  )}
                </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
