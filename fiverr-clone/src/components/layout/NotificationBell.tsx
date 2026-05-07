'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationBellProps {
  pathname?: string;
}

export function NotificationBell({ pathname }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seeAllHref = pathname?.startsWith('/sell') ? '/sell/notifications' : '/notifications';

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((data) => {
          if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
          if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  const markAsRead = async (notificationId?: string) => {
    const body = notificationId ? { notificationId } : { markAllRead: true };
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    fetchNotifications();
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read_at) {
      await markAsRead(n.id);
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await markAsRead();
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="relative p-2"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={20} style={{ color: 'var(--muted-foreground)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-hidden rounded-xl border shadow-lg"
          style={{ backgroundColor: 'var(--white)', borderColor: 'var(--gray-200)' }}
        >
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--gray-300)] border-t-[var(--primary)]" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: 'var(--gray-500)' }}>
                No notifications yet
              </p>
            ) : (
              <ul>
                {notifications.slice(0, 10).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="block w-full text-left px-4 py-3 hover:bg-[var(--gray-50)] border-b last:border-b-0"
                      style={{ borderColor: 'var(--gray-100)' }}
                    >
                      <p
                        className={`text-sm font-medium truncate ${!n.read_at ? 'font-semibold' : ''}`}
                        style={{ color: 'var(--black)' }}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--gray-500)' }}>
                          {n.body}
                        </p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div
            className="flex border-t"
            style={{ borderColor: 'var(--gray-100)', backgroundColor: 'var(--gray-50)' }}
          >
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex-1 px-4 py-3 text-center text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--primary)' }}
              >
                Mark all as read
              </button>
            )}
            <Link
              href={seeAllHref}
              onClick={() => setOpen(false)}
              className={`${unreadCount > 0 ? 'border-l' : 'flex-1'} block px-4 py-3 text-center text-sm font-medium`}
              style={{ color: 'var(--primary)', borderColor: 'var(--gray-200)' }}
            >
              See all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
