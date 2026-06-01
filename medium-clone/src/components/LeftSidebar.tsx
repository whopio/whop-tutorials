"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  BookMarked,
  User as UserIcon,
  FileText,
  Users,
  Plus,
  X,
} from "lucide-react";
import { useSidebar } from "./SidebarProvider";
import { cn } from "@/lib/utils";

interface FollowingWriter {
  username: string;
  name: string | null;
  avatar: string | null;
}

interface Props {
  username: string;
  followingWriters: FollowingWriter[];
}

export function LeftSidebar({ username, followingWriters }: Props) {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();
  const pathname = usePathname();

  // The four primary nav items. Each renders as `[icon] [label]` always —
  // icon on the left, label on the right.
  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/me/library", label: "Library", icon: BookMarked },
    { href: `/@${username}`, label: "Profile", icon: UserIcon },
    { href: "/me/stories", label: "Stories", icon: FileText },
  ];

  // On desktop, the sidebar is either fully visible (240px) or fully hidden
  // (slid off-screen). On mobile, the same `<aside>` is the drawer.
  const desktopHidden = collapsed;
  const ariaHidden = desktopHidden && !mobileOpen ? true : undefined;

  return (
    <>
      {/* Mobile backdrop — click to close drawer */}
      <div
        aria-hidden="true"
        onClick={closeMobile}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden transition-opacity",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        aria-label="Primary navigation"
        aria-hidden={ariaHidden}
        className={cn(
          // Always fixed on the left, starts below the 57px-tall header.
          "fixed left-0 top-[57px] bottom-0 z-40 bg-background border-r border-border overflow-y-auto",
          "transition-transform duration-200 ease-out",
          // Width: 280px on mobile (drawer), 240px on desktop.
          "w-[280px] lg:w-[240px]",
          // Mobile: open/close via translate driven by drawer state.
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: overrides mobile translate. Visible by default, slides
          // fully off-screen when collapsed.
          desktopHidden
            ? "lg:-translate-x-full lg:pointer-events-none"
            : "lg:translate-x-0 lg:pointer-events-auto",
        )}
      >
        {/* Mobile-only header with close button */}
        <div className="lg:hidden flex items-center justify-between px-4 h-12 border-b border-border">
          <span className="text-xs uppercase tracking-wider text-text-tertiary">Menu</span>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation"
            className="inline-flex items-center justify-center size-8 rounded-full hover:bg-surface text-text-secondary hover:text-text-primary"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <nav className="py-4">
          <ul>
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={closeMobile}
                    aria-current={active ? "page" : undefined}
                    tabIndex={ariaHidden ? -1 : undefined}
                    className={cn(
                      "group relative flex items-center gap-4 h-11 px-5 transition-colors",
                      active
                        ? "text-text-primary"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface/60",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-text-primary"
                      />
                    )}
                    <Icon aria-hidden="true" className="size-[20px] shrink-0" />
                    <span className="text-[15px] font-medium">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Divider before the Following section */}
          <div aria-hidden="true" className="my-4 mx-5 border-t border-border" />

          {/* Following section */}
          <div className="px-5">
            <div className="flex items-center gap-3 mb-2">
              <Users aria-hidden="true" className="size-[20px] text-text-secondary shrink-0" />
              <span className="text-[15px] font-medium text-text-secondary">Following</span>
            </div>

            {followingWriters.length > 0 ? (
              <ul className="space-y-2 mt-3">
                {followingWriters.map((w) => {
                  const initial = (w.name || w.username).slice(0, 1).toUpperCase();
                  return (
                    <li key={w.username}>
                      <Link
                        href={`/@${w.username}`}
                        onClick={closeMobile}
                        tabIndex={ariaHidden ? -1 : undefined}
                        className="flex items-center gap-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
                      >
                        {w.avatar ? (
                          <Image
                            src={w.avatar}
                            alt=""
                            width={24}
                            height={24}
                            className="size-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="size-6 rounded-full bg-gradient-to-br from-brand to-brand-hover text-white text-[10px] flex items-center justify-center shrink-0 font-display"
                          >
                            {initial}
                          </span>
                        )}
                        <span className="truncate">{w.name ?? `@${w.username}`}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-3 flex items-start gap-3">
                <Plus aria-hidden="true" className="size-[20px] text-text-secondary shrink-0 mt-0.5" />
                <div className="text-sm text-text-secondary leading-snug">
                  Find writers and publications to follow.
                  <div className="mt-1">
                    <Link
                      href="/topics"
                      onClick={closeMobile}
                      tabIndex={ariaHidden ? -1 : undefined}
                      className="underline text-text-primary hover:text-text-primary"
                    >
                      See suggestions
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
