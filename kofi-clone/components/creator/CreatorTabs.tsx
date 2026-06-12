"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Home", path: "" },
  { label: "Membership", path: "/membership" },
  { label: "Shop", path: "/shop" },
  { label: "Gallery", path: "/gallery" },
  { label: "Posts", path: "/posts" },
];

export default function CreatorTabs({ username }: { username: string }) {
  const pathname = usePathname();
  const base = `/${username}`;

  return (
    <div className="no-scrollbar overflow-x-auto border-b border-line">
      <div className="mx-auto flex max-w-5xl gap-6 px-5">
        {TABS.map((tab) => {
          const href = `${base}${tab.path}`;
          const active = tab.path === "" ? pathname === base : pathname === href;
          return (
            <Link
              key={tab.label}
              href={href}
              className={`whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition ${
                active
                  ? "border-[var(--accent)] text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
