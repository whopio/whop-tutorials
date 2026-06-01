import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { HamburgerButton } from "@/components/HamburgerButton";
import { SearchBar } from "@/components/SearchBar";
import { SearchButton } from "@/components/SearchButton";

/**
 * Top header. Width is now full-bleed (no `max-w-[1336px]` centering) so the
 * fixed LeftSidebar can sit flush against the page edge below.
 *
 * `signedIn` is passed by AppShell to avoid an extra getAuthUser() call,
 * but we still fetch the user here for NotificationBell + UserMenu props.
 * React's request-scope caching dedupes the two calls when both run in the
 * same render — leaving it explicit keeps the component self-contained
 * for direct use during the migration.
 */
export async function TopNav({ signedIn }: { signedIn?: boolean } = {}) {
  const user = signedIn === false ? null : await getAuthUser();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-[57px]">
        {/* Left cluster: hamburger (signed-in only), logo, desktop search */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {user && <HamburgerButton />}
          <Logo />
          <SearchBar />
        </div>

        {/* Right cluster */}
        <nav className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <Link
                href="/new-story"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm text-text-secondary hover:text-text-primary"
              >
                <span aria-hidden="true">✎</span> Write
              </Link>
              <SearchButton />
              <NotificationBell userId={user.id} />
              <UserMenu
                avatar={user.avatar ?? null}
                name={user.name ?? user.username}
                username={user.username}
              />
            </>
          ) : (
            <>
              <SearchButton />
              <Link
                href="/membership"
                className="hidden sm:inline-flex px-3 py-1.5 rounded-pill text-sm text-text-secondary hover:text-text-primary"
              >
                Subscribe
              </Link>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /api/auth/login is a route handler returning a 307 redirect, not a page */}
              <a
                href="/api/auth/login"
                className="hidden sm:inline-flex px-3 py-1.5 rounded-pill text-sm text-text-secondary hover:text-text-primary"
              >
                Sign in
              </a>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- route handler */}
              <a
                href="/api/auth/login?returnTo=/new-story"
                className="inline-flex items-center px-4 py-2 rounded-pill text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors"
              >
                Start writing
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
