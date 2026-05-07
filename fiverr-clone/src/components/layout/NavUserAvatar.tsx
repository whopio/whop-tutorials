'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  LogOut,
  User,
  Package,
  Briefcase,
  MessageSquare,
  Heart,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { C, GFAvatar } from '@/components/gigflow/design-system';

const MENU_ITEMS = [
  { icon: User, label: 'Profile', href: '/account/settings' },
  { icon: Package, label: 'My Orders', href: '/account' },
  { icon: Briefcase, label: 'My Gigs', href: '/sell/gigs' },
  { icon: MessageSquare, label: 'Messages', href: '/messages' },
  { icon: Heart, label: 'Favorites', href: '/account/favorites' },
  { icon: Settings, label: 'Settings', href: '/account/settings' },
];

export function NavUserAvatar() {
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
    email: string | null;
    isSeller?: boolean;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/profile/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setProfile(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    window.location.href = '/api/auth/signout';
  };

  const displayName = profile?.display_name || profile?.username || 'Account';
  const subtext = profile?.email || (profile?.username ? `@${profile.username}` : null);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 transition hover:bg-black/[0.05] min-h-[44px] min-w-[44px]"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <GFAvatar src={profile?.avatar_url ?? undefined} name={displayName} size="xs" />
        <ChevronDown size={14} style={{ color: C.muted }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 mr-2 w-64 max-w-[min(16rem,100vw-1rem)] overflow-hidden rounded-2xl border py-2 shadow-xl"
          style={{ backgroundColor: C.white, borderColor: C.border }}
        >
          <div className="border-b px-4 py-3 mb-1" style={{ borderColor: C.border }}>
            <div className="flex items-center gap-3">
              <GFAvatar src={profile?.avatar_url ?? undefined} name={displayName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>
                  {displayName}
                </p>
                {subtext && (
                  <p className="truncate text-xs" style={{ color: C.muted }}>
                    {subtext}
                  </p>
                )}
              </div>
            </div>
          </div>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-black/[0.03] min-h-[44px]"
              style={{ color: C.ink }}
            >
              <item.icon size={16} style={{ color: C.muted }} />
              {item.label}
            </Link>
          ))}
          <div className="mt-1 border-t pt-1" style={{ borderColor: C.border }}>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-red-50 min-h-[44px]"
              style={{ color: C.error }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
