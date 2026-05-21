import { Suspense } from "react";
import Link from "next/link";
import { getSellerProfile, isAuthenticated } from "@/lib/auth";
import { Logo } from "./Logo";
import { HeaderSearch } from "./HeaderSearch";
import { NavToolBar } from "./NavToolBar";
import { NavCategoryBar } from "./NavCategoryBar";

export function Header() {
  // The brand row + search + nav bars are fully static (no session, no DB).
  // The session-aware right nav streams in through Suspense so the rest of
  // the header prerenders and the page below it doesn't wait on the cookie
  // read.
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-background)]/85 backdrop-blur-md">
      <div className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Stax home"
            className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <Logo />
          </Link>

          <Suspense fallback={<HeaderSearchFallback />}>
            <HeaderSearch />
          </Suspense>

          <Suspense fallback={<HeaderUserNavFallback />}>
            <HeaderUserNav />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<NavBarFallback />}>
        <NavToolBar />
      </Suspense>
      <Suspense fallback={null}>
        <NavCategoryBar />
      </Suspense>
    </header>
  );
}

function HeaderSearchFallback() {
  return <div aria-hidden className="flex flex-1 md:max-w-md lg:max-w-lg" />;
}

function NavBarFallback() {
  return (
    <div aria-hidden className="border-b border-[var(--color-border)]">
      <div className="mx-auto h-11 max-w-7xl" />
    </div>
  );
}

/**
 * Static-shaped placeholder rendered while the session lookup is in flight.
 * Matches the height of the real nav so layout doesn't shift when it
 * hydrates.
 */
function HeaderUserNavFallback() {
  return <nav aria-hidden className="flex h-9 items-center gap-2" />;
}

async function HeaderUserNav() {
  const user = await isAuthenticated();
  const seller = user ? await getSellerProfile(user.id) : null;

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {user && (
        <Link
          href={seller ? "/sell/dashboard" : "/sell"}
          className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] sm:inline-flex"
        >
          {seller ? "Seller dashboard" : "Become a seller"}
        </Link>
      )}
      {user ? (
        <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-1 pr-1 text-sm">
          <Link
            href={seller ? "/sell/dashboard" : "/dashboard"}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 transition hover:bg-[var(--color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label={seller ? "Seller dashboard" : "Your library"}
          >
            <span className="hidden text-[var(--color-text-secondary)] sm:inline">
              Hi,
            </span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {user.name?.split(" ")[0] ?? user.email.split("@")[0]}
            </span>
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-full px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <a
          href="/api/auth/login"
          className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
        >
          Sign in
        </a>
      )}
    </nav>
  );
}
