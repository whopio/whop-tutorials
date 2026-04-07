// src/components/navbar.tsx
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { Store, ShoppingBag, LogOut, LogIn } from "lucide-react";

export async function Navbar() {
  const user = await getAuthUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-text-primary">
          <Store className="h-6 w-6 text-accent" aria-hidden="true" />
          <span className="hidden sm:inline">Shelfie</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/products"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Browse
          </Link>

          {user ? (
            <>
              <Link
                href="/sell/dashboard"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Sell
              </Link>
              <Link
                href="/dashboard"
                aria-label="My purchases"
                className="p-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </Link>
              <div className="flex items-center gap-2 sm:gap-3">
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.name || "User avatar"}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    aria-label="Sign out"
                    className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
