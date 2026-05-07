'use client';

import { useRouter } from 'next/navigation';

interface MarkAllReadButtonProps {
  unreadCount: number;
  className?: string;
}

export function MarkAllReadButton({ unreadCount, className }: MarkAllReadButtonProps) {
  const router = useRouter();

  if (unreadCount === 0) return null;

  const handleClick = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={{ color: 'var(--primary)' }}
    >
      Mark all as read
    </button>
  );
}
