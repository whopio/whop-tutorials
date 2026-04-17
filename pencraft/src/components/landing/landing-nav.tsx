import Link from "next/link";

export function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-border-subtle bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="Pencraft home">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 24" fill="none" className="h-7 w-auto text-text-primary">
            <path d="M2 20 L5 4 L8 4 L11 12 L10 4 L13 4 L10 20 L7 20 L4 12 L5 20 Z" fill="#6366f1"/>
            <text x="18" y="18" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="700" fill="currentColor" letterSpacing="-0.03em">pencraft</text>
          </svg>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="#pricing"
            className="rounded px-2 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary sm:px-3 sm:text-sm"
          >
            Pricing
          </Link>
          <Link
            href="#templates"
            className="rounded px-2 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary sm:px-3 sm:text-sm"
          >
            Templates
          </Link>
          {isAuthenticated ? (
            <Link
              href="/studio"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Go to Studio
            </Link>
          ) : (
            <Link
              href="/api/auth/login"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Sign in with Whop
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
