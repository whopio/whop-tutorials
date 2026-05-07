'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Logo } from '@/components/ui';
import { NavUserAvatar } from './NavUserAvatar';
import { NotificationBell } from './NotificationBell';

interface AppHeaderProps {
  mode: 'buyer' | 'seller';
  isSeller?: boolean;
  showSearch?: boolean;
  pathname?: string;
}

export function AppHeader({ mode, isSeller = false, showSearch = true, pathname }: AppHeaderProps) {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-50 px-4 py-3 md:px-6 md:py-3"
      style={{ backgroundColor: 'var(--white)', borderBottom: '1px solid var(--gray-200)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 md:gap-6">
        <div className="shrink-0">
          <Logo />
        </div>

        {showSearch && mode === 'buyer' && (
          <form
            action="/search"
            method="get"
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const q = (form.elements.namedItem('q') as HTMLInputElement)?.value;
              router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
            }}
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
            <input
              name="q"
              type="text"
              placeholder="Search services..."
              className="w-full rounded-lg border border-transparent bg-[var(--gray-100)] py-2 pl-9 pr-3 text-sm text-[var(--black)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </form>
        )}

        <nav className="ml-auto flex items-center gap-3 md:gap-4">
          {mode === 'buyer' ? (
            <>
              <Link
                href="/messages"
                className="hidden text-xs font-medium text-[var(--gray-600)] hover:text-[var(--black)] sm:block md:text-sm"
              >
                Messages
              </Link>
              <Link
                href="/orders"
                className="hidden text-xs font-medium text-[var(--gray-600)] hover:text-[var(--black)] sm:block md:text-sm"
              >
                Orders
              </Link>
              {isSeller && (
                <Link
                  href="/sell/dashboard"
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--gray-100)] md:px-4 md:py-2 md:text-sm"
                  style={{ borderColor: 'var(--gray-200)', color: 'var(--black)' }}
                >
                  Switch to Selling
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                href="/sell/dashboard"
                className="hidden text-xs font-medium text-[var(--gray-600)] hover:text-[var(--black)] sm:block md:text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/sell/gigs"
                className="hidden text-xs font-medium text-[var(--gray-600)] hover:text-[var(--black)] sm:block md:text-sm"
              >
                Gigs
              </Link>
              <Link
                href="/sell/orders"
                className="hidden text-xs font-medium text-[var(--gray-600)] hover:text-[var(--black)] sm:block md:text-sm"
              >
                Orders
              </Link>
              <Link
                href="/"
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--gray-100)] md:px-4 md:py-2 md:text-sm"
                style={{ borderColor: 'var(--gray-200)', color: 'var(--black)' }}
              >
                Switch to Buying
              </Link>
            </>
          )}
          <NotificationBell pathname={pathname} />
          <NavUserAvatar />
        </nav>
      </div>
    </header>
  );
}
