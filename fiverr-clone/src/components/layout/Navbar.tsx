"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  MessageSquare,
  Menu,
} from "lucide-react";
import { Logo, C, GFButton } from "@/components/gigflow/design-system";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { NavUserAvatar } from "./NavUserAvatar";
import { Sheet } from "@/components/ui/Sheet";

interface NavbarProps {
  user: { id: string } | null;
  mode?: "buyer" | "seller";
  isSeller?: boolean;
  pathname?: string;
}

export function NavbarClient({
  user: userProp,
  mode: modeProp = "buyer",
  pathname,
}: Omit<NavbarProps, "isSeller" | "user"> & { user?: { id: string } | null }) {
  const [user, setUser] = useState<{ id: string } | null>(userProp ?? null);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    if (userProp !== undefined) {
      setUser(userProp);
      return;
    }
    fetch("/api/profile/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUser({ id: "1" });
          setIsSeller(!!data.isSeller);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [userProp]);

  const resolvedUser = userProp !== undefined ? userProp : user;
  return (
    <Navbar user={resolvedUser} mode={modeProp} isSeller={isSeller} pathname={pathname} />
  );
}

const pageToPath: Record<string, string> = {
  cover: "/",
  login: "/login",
  marketplace: "/search",
  account: "/account",
  orders: "/orders",
  messages: "/messages",
  profile: "/account",
  "gig-create": "/sell/gigs/new",
  seller: "/sell/dashboard",
};

function pathToPage(pathname: string): string {
  if (!pathname || pathname === "/") return "cover";
  if (pathname.startsWith("/search") || pathname.startsWith("/categories"))
    return "marketplace";
  if (pathname.startsWith("/account") || pathname.startsWith("/orders"))
    return "account";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/sell")) return "seller";
  return "marketplace";
}

function NavLink({
  href,
  children,
  active,
  onClick,
  className,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block min-h-[44px] flex items-center px-4 py-3 text-sm font-medium transition",
        active ? "bg-black/[0.05]" : "",
        className
      )}
      style={{ color: active ? C.ink : C.muted }}
    >
      {children}
    </Link>
  );
}

export function Navbar({
  user,
  mode = "buyer",
  isSeller = false,
  pathname: pathnameProp,
}: NavbarProps) {
  const pathname = pathnameProp ?? usePathname();
  const currentPage = pathToPage(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return (
      <>
        <nav
          className="fixed top-0 left-0 right-0 z-50 px-4 py-3 sm:px-6 sm:py-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(24px)",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between min-h-[52px]">
            <Link href="/" className="flex items-center">
              <Logo />
            </Link>
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/search"
                className="min-h-[44px] flex items-center px-4 py-2 rounded-lg text-sm font-medium hover:bg-black/[0.05] transition"
                style={{ color: C.muted }}
              >
                Browse
              </Link>
              <Link
                href="/login?signup=1&next=/sell/onboarding"
                className="min-h-[44px] flex items-center px-4 py-2 rounded-lg text-sm font-medium hover:bg-black/[0.05] transition"
                style={{ color: C.muted }}
              >
                Become a Seller
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="md:hidden p-2 rounded-xl hover:bg-black/5 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={20} style={{ color: C.ink }} />
              </button>
              <Link href="/login" className="hidden md:block">
                <GFButton variant="ghost" size="sm">
                  Sign in
                </GFButton>
              </Link>
              <Link href="/search" className="hidden md:block">
                <GFButton variant="brand" size="sm">
                  Get started
                </GFButton>
              </Link>
            </div>
          </div>
        </nav>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="right">
          <div className="px-4 pb-6 flex flex-col gap-1 items-center" onClick={() => setMobileMenuOpen(false)}>
            <NavLink href="/search" onClick={() => setMobileMenuOpen(false)}>
              Browse
            </NavLink>
            <NavLink href="/login?signup=1&next=/sell/onboarding" onClick={() => setMobileMenuOpen(false)}>
              Become a Seller
            </NavLink>
            <div className="border-t mt-4 pt-4 flex flex-col gap-2" style={{ borderColor: C.border }}>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center justify-center px-4 rounded-xl text-sm font-medium border"
                style={{ borderColor: C.border, color: C.ink }}
              >
                Sign in
              </Link>
              <Link
                href="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center justify-center px-4 rounded-xl text-sm font-semibold"
                style={{ background: C.brand, color: "white" }}
              >
                Get started
              </Link>
            </div>
          </div>
        </Sheet>
      </>
    );
  }

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 px-4 h-14 flex items-center sm:px-6"
        style={{
          backgroundColor: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(24px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="w-full flex items-center gap-2 sm:gap-4">
          <Link href="/search" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>

          {mode === "buyer" && (
            <form
              action="/search"
              method="get"
              className="flex-1 max-w-md relative hidden md:block"
            >
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: C.muted }}
              />
              <input
                name="q"
                placeholder="Search services, skills, or sellers..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: C.surface,
                  borderColor: C.border,
                  color: C.ink,
                  "--tw-ring-color": C.brand,
                } as React.CSSProperties}
              />
            </form>
          )}

          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {mode === "buyer" ? (
              <>
                <Link
                  href="/search"
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    currentPage === "marketplace" && "bg-black/[0.05]"
                  )}
                  style={{
                    color: currentPage === "marketplace" ? C.ink : C.muted,
                  }}
                >
                  Explore
                </Link>
                <Link
                  href="/orders"
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    currentPage === "account" && "bg-black/[0.05]"
                  )}
                  style={{
                    color: currentPage === "account" ? C.ink : C.muted,
                  }}
                >
                  Orders
                </Link>
                <Link
                  href="/messages"
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    currentPage === "messages" && "bg-black/[0.05]"
                  )}
                  style={{
                    color: currentPage === "messages" ? C.ink : C.muted,
                  }}
                >
                  Messages
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sell/dashboard"
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    pathname === "/sell/dashboard" && "bg-black/[0.05]"
                  )}
                  style={{ color: C.muted }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/sell/gigs"
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    pathname.startsWith("/sell/gigs") && "bg-black/[0.05]"
                  )}
                  style={{ color: C.muted }}
                >
                  Gigs
                </Link>
                <Link
                  href="/sell/orders"
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    pathname === "/sell/orders" && "bg-black/[0.05]"
                  )}
                  style={{ color: C.muted }}
                >
                  Orders
                </Link>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell pathname={pathname} />
            <Link
              href="/messages"
              className="relative p-2 rounded-xl hover:bg-black/5 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Messages"
            >
              <MessageSquare size={18} style={{ color: C.muted }} />
            </Link>
            <NavUserAvatar />
            {mode === "buyer" && isSeller && (
              <Link href="/sell/dashboard" className="ml-2 hidden sm:block">
                <GFButton variant="outline" size="sm">
                  Switch to Selling
                </GFButton>
              </Link>
            )}
            {mode === "seller" && (
              <Link href="/" className="ml-2 hidden sm:block">
                <GFButton variant="outline" size="sm">
                  Switch to Buying
                </GFButton>
              </Link>
            )}
            <Link href="/sell/gigs/new" className="ml-2 hidden sm:block">
              <GFButton variant="brand" size="sm">
                Create Gig
              </GFButton>
            </Link>
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl hover:bg-black/5 transition min-h-[44px] min-w-[44px] flex items-center justify-center ml-1"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} style={{ color: C.ink }} />
            </button>
          </div>
        </div>
      </header>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="right">
        <div className="px-4 pb-6 flex flex-col gap-1">
          {mode === "buyer" && (
            <form action="/search" method="get" className="mb-2 px-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: C.muted }}
                />
                <input
                  name="q"
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 min-h-[44px]"
                  style={{
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    color: C.ink,
                    "--tw-ring-color": C.brand,
                  } as React.CSSProperties}
                />
              </div>
            </form>
          )}
          {mode === "buyer" ? (
            <>
              <NavLink href="/search" active={currentPage === "marketplace"} onClick={closeMobileMenu}>
                Explore
              </NavLink>
              <NavLink href="/orders" active={currentPage === "account"} onClick={closeMobileMenu}>
                Orders
              </NavLink>
              <NavLink href="/messages" active={currentPage === "messages"} onClick={closeMobileMenu}>
                Messages
              </NavLink>
            </>
          ) : (
            <>
              <NavLink href="/sell/dashboard" active={pathname === "/sell/dashboard"} onClick={closeMobileMenu}>
                Dashboard
              </NavLink>
              <NavLink href="/sell/gigs" active={pathname.startsWith("/sell/gigs")} onClick={closeMobileMenu}>
                Gigs
              </NavLink>
              <NavLink href="/sell/orders" active={pathname === "/sell/orders"} onClick={closeMobileMenu}>
                Orders
              </NavLink>
            </>
          )}
          <div className="border-t mt-4 pt-4 flex flex-col gap-2" style={{ borderColor: C.border }}>
            {mode === "buyer" && isSeller && (
              <Link
                href="/sell/dashboard"
                onClick={closeMobileMenu}
                className="min-h-[44px] flex items-center justify-center px-4 rounded-xl text-sm font-medium border"
                style={{ borderColor: C.border, color: C.ink }}
              >
                Switch to Selling
              </Link>
            )}
            {mode === "seller" && (
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="min-h-[44px] flex items-center justify-center px-4 rounded-xl text-sm font-medium border"
                style={{ borderColor: C.border, color: C.ink }}
              >
                Switch to Buying
              </Link>
            )}
            <Link
              href="/sell/gigs/new"
              onClick={closeMobileMenu}
              className="min-h-[44px] flex items-center justify-center px-4 rounded-xl text-sm font-semibold"
              style={{ background: C.brand, color: "white" }}
            >
              Create Gig
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}
