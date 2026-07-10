"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, Search, Video, User } from "lucide-react";
import type { SessionUser } from "@/lib/session";
import { WavoraLogo } from "@/components/ui/wavora-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "./notification-bell";
import { useSidebar } from "./sidebar-context";

export function TopBar({ user }: { user: SessionUser | null }) {
  const { toggle, setMobileOpen } = useSidebar();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 bg-canvas px-4">
      {showSearch ? (
        // DESIGN-4 (mobile): full-width search revealed by the search icon.
        <form
          role="search"
          action="/results"
          className="flex h-10 w-full items-center gap-2"
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setShowSearch(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-hover"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-10 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 focus-within:border-accent">
            <Search className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              type="text"
              name="search_query"
              placeholder="Search Wavora"
              autoFocus
              autoComplete="off"
              className="h-full w-full bg-transparent outline-none placeholder:text-fg-muted"
            />
          </div>
        </form>
      ) : (
        <>
          {/* Left: menu + wordmark */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Menu"
              onClick={() => {
                // Desktop (lg+): pin/unpin the rail. Mobile: open the drawer.
                if (window.matchMedia("(min-width: 1024px)").matches) toggle();
                else setMobileOpen(true);
              }}
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-hover"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" aria-label="Wavora home" className="ml-1">
              <WavoraLogo />
            </Link>
          </div>

          {/* Search: left-of-center, single pill with a leading icon, grows on focus */}
          <form
            role="search"
            action="/results"
            className="ml-4 hidden h-10 w-full max-w-[440px] items-center gap-2 rounded-full border border-border bg-surface px-4 transition-[max-width,box-shadow] duration-200 focus-within:max-w-[520px] focus-within:border-accent focus-within:shadow-sm sm:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              type="text"
              name="search_query"
              placeholder="Search Wavora"
              autoComplete="off"
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-fg-muted"
            />
          </form>

          {/* Right: actions, tight cluster pinned to the edge */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setShowSearch(true)}
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-hover sm:hidden"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/studio/upload"
              className="mr-1 hidden items-center gap-2 rounded-full bg-hover px-3.5 py-2 text-sm font-medium hover:bg-hover-strong sm:flex"
            >
              <Video className="h-5 w-5" />
              Create
            </Link>
            {user ? <NotificationBell /> : null}
            <ThemeToggle />

            {user ? (
              <Link
                href="/studio/videos"
                aria-label={`Account: ${user.username}`}
                className="ml-1 grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-hover"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-fg-muted" />
                )}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="ml-2 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
              >
                <User className="h-5 w-5" />
                Sign in
              </Link>
            )}
          </div>
        </>
      )}
    </header>
  );
}
