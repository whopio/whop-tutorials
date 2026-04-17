import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border-subtle bg-bg py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 24" fill="none" className="h-4 w-auto text-text-primary">
            <path d="M2 20 L5 4 L8 4 L11 12 L10 4 L13 4 L10 20 L7 20 L4 12 L5 20 Z" fill="#6366f1"/>
            <text x="18" y="18" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="700" fill="currentColor" letterSpacing="-0.03em">pencraft</text>
          </svg>
          <span className="text-xs text-text-muted">&copy; {new Date().getFullYear()} Pencraft</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-text-tertiary">
          <Link href="https://github.com/whopio/whop-tutorials/" className="transition-colors hover:text-text-primary" target="_blank" rel="noreferrer">
            GitHub
          </Link>
          <Link href="https://whop.com" className="transition-colors hover:text-text-primary" target="_blank" rel="noreferrer">
            Built with Whop
          </Link>
        </div>
      </div>
    </footer>
  );
}
