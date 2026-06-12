import Link from "next/link";
import BrandIcon from "@/components/BrandIcon";

export default function SiteFooter() {
  return (
    <footer className="bg-page">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="kofi-card grid grid-cols-2 gap-8 p-8 sm:grid-cols-4">
          <div>
            <p className="font-bold">Features</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link href="/features" className="hover:text-ink">Tips</Link></li>
              <li><Link href="/features" className="hover:text-ink">Memberships</Link></li>
              <li><Link href="/features" className="hover:text-ink">Shop</Link></li>
              <li><Link href="/features" className="hover:text-ink">Posts</Link></li>
              <li><Link href="/features" className="hover:text-ink">Goals</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold">Discover</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link href="/explore" className="hover:text-ink">Explore creators</Link></li>
              <li><Link href="/features" className="hover:text-ink">How it works</Link></li>
              <li><Link href="/#faq" className="hover:text-ink">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><a href="/api/auth/login" className="hover:text-ink">Log in</a></li>
              <li><a href="/api/auth/login?returnTo=/dashboard/start" className="hover:text-ink">Get started</a></li>
              <li><Link href="/dashboard" className="hover:text-ink">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold">About Cuppa</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><a href="https://whop.com" target="_blank" rel="noreferrer" className="hover:text-ink">Powered by Whop</a></li>
              <li><a href="https://nextjs.org" target="_blank" rel="noreferrer" className="hover:text-ink">Built with Next.js</a></li>
              <li>Made for creators</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <BrandIcon name="coffee" className="h-8 w-8" />
            <span className="font-display text-lg font-extrabold">Cuppa</span>
          </Link>
          <p className="text-sm text-muted">© 2026 Cuppa. Built with Next.js and Whop.</p>
        </div>
      </div>
    </footer>
  );
}
