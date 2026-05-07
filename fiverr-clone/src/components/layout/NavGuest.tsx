import Link from 'next/link';
import { Logo, Button } from '@/components/ui';

export function NavGuest() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-6 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/search" className="text-sm font-medium text-[var(--gray-600)] hover:text-[var(--black)]">
            Browse
          </Link>
          <Link href="/login?signup=1&next=/sell/onboarding" className="text-sm font-medium text-[var(--gray-600)] hover:text-[var(--black)]">
            Become a Seller
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/login?signup=1">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
