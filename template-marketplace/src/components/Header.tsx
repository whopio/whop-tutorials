import Link from "next/link";
import { getSellerProfile, isAuthenticated } from "@/lib/auth";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export async function Header() {
  const user = await isAuthenticated();
  const seller = user ? await getSellerProfile(user.id) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Stax home"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              href={seller ? "/sell/dashboard" : "/sell"}
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] sm:inline-flex"
            >
              {seller ? "Seller dashboard" : "Become a seller"}
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-1 pr-1 text-sm">
              <Link
                href={seller ? "/sell/dashboard" : "/dashboard"}
                className="flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-[var(--color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
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
                  className="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/sign-in"
              prefetch={false}
              className="rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
