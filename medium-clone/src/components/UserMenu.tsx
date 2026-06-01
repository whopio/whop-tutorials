"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggleItem } from "@/components/ThemeToggleItem";

export function UserMenu({
  avatar,
  name,
  username,
}: {
  avatar: string | null;
  name: string;
  username: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Open user menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="size-9 rounded-full overflow-hidden bg-surface border border-border flex items-center justify-center"
      >
        {avatar ? (
          <Image src={avatar} alt="" width={36} height={36} className="size-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-text-secondary">
            {(name || username).slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>

      <div
        role="menu"
        className={cn(
          "absolute right-0 mt-2 w-56 rounded-md border border-border bg-background shadow-lg origin-top-right transition-all",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
        )}
      >
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-medium text-text-primary truncate">{name}</div>
          <div className="text-xs text-text-secondary truncate">@{username}</div>
        </div>
        <Item href={`/@${username}`}>Profile</Item>
        <Item href="/me/stories">My stories</Item>
        <Item href="/me/library">Library</Item>
        <Item href="/me/dashboard">Dashboard</Item>
        <Item href="/me/membership">Membership</Item>
        <Item href="/me/settings">Settings</Item>
        <div className="border-t border-border">
          <ThemeToggleItem />
        </div>
        <div className="border-t border-border">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="block w-full text-left px-4 py-2 text-sm text-error hover:bg-surface"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block px-4 py-2 text-sm text-text-primary hover:bg-surface"
    >
      {children}
    </Link>
  );
}
