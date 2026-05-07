'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  Briefcase,
  Users,
  AlertCircle,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Logo, Badge } from '@/components/ui';
import { Sheet } from '@/components/ui/Sheet';

const navItems = [
  { id: 'overview', href: '/admin', icon: TrendingUp, label: 'Overview' },
  { id: 'gigs', href: '/admin/gigs', icon: Package, label: 'Gig Reviews' },
  { id: 'orders', href: '/admin/orders', icon: Briefcase, label: 'Orders' },
  { id: 'sellers', href: '/admin/sellers', icon: Users, label: 'Sellers' },
  { id: 'disputes', href: '/admin/disputes', icon: AlertCircle, label: 'Disputes' },
  { id: 'webhooks', href: '/admin/webhooks', icon: Globe, label: 'Webhooks' },
  { id: 'settings', href: '/admin/settings', icon: Settings, label: 'Settings' },
];

function AdminNavContent({
  pendingCount,
  onLinkClick,
  showCloseButton,
}: {
  pendingCount: number | null;
  onLinkClick?: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <>
      {(showCloseButton && onLinkClick) && (
        <button
          type="button"
          onClick={onLinkClick}
          className="absolute top-4 right-4 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      )}
      <div className="mb-8">
        <Logo dark />
        <div className="mt-2 px-2">
          <Badge variant="default">Admin</Badge>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={onLinkClick}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--gray-400)] transition-all hover:bg-white/5 hover:text-white min-h-[44px]"
          >
            <item.icon size={18} />
            {item.label}
            {item.id === 'gigs' && pendingCount != null && pendingCount > 0 && (
              <span
                className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <Link
          href="/api/auth/signout?next=/admin/login"
          onClick={onLinkClick}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--gray-400)] hover:bg-white/5 min-h-[44px]"
        >
          <LogOut size={18} />
          Logout
        </Link>
      </div>
    </>
  );
}

export function NavAdmin() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/pending-count')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && typeof data.pendingCount === 'number' && setPendingCount(data.pendingCount))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 hidden md:flex h-screen w-64 flex-col p-6"
        style={{ backgroundColor: 'var(--black)' }}
      >
        <AdminNavContent pendingCount={pendingCount} />
      </aside>

      {/* Mobile header + drawer */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between px-4"
        style={{ backgroundColor: 'var(--black)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-[var(--gray-400)] hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Logo dark />
          <Badge variant="default">Admin</Badge>
        </div>
        <div className="w-11" aria-hidden />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left" showCloseButton={false}>
        <div
          className="relative flex h-full flex-col p-6"
          style={{ backgroundColor: 'var(--black)' }}
        >
          <AdminNavContent
            pendingCount={pendingCount}
            onLinkClick={() => setMobileOpen(false)}
            showCloseButton
          />
        </div>
      </Sheet>
    </>
  );
}
