import Link from 'next/link';
import { Zap } from 'lucide-react';
import { C } from '@/lib/design-tokens';

export function Footer() {
  return (
    <footer className="py-10 px-4 sm:px-6 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-6 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <Link href="/" className="flex items-center gap-2" style={{ color: C.ink }}>
            <Zap size={18} style={{ color: C.brand }} />
            <span className="font-bold tracking-tight">gigflow</span>
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 sm:gap-x-8">
            {['About', 'Careers', 'Blog', 'Press', 'Terms', 'Privacy'].map((l) => (
              <Link
                key={l}
                href="#"
                className="text-sm hover:opacity-70 transition min-h-[44px] sm:min-h-0 flex items-center py-1"
                style={{ color: C.muted }}
              >
                {l}
              </Link>
            ))}
          </nav>
        </div>
        <p className="text-sm text-center sm:text-left order-last sm:order-none" style={{ color: C.subtle }}>
          © {new Date().getFullYear()} gigflow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
