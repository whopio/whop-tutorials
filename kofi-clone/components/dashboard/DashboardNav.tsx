"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Gear, Users, Wallet, FileText, Crown, Bag } from "@/components/Icons";

type IconType = React.ComponentType<{ className?: string }>;
type NavItem = { label: string; href: string; icon: IconType };
type NavGroup = { label?: string; items: NavItem[] };

export default function DashboardNav({ username }: { username: string }) {
  const pathname = usePathname();

  const groups: NavGroup[] = [
    {
      items: [
        { label: "Home", href: "/dashboard", icon: Home },
        { label: "Your page", href: `/${username}`, icon: User },
        { label: "Settings", href: "/dashboard/settings", icon: Gear },
      ],
    },
    {
      label: "Earnings",
      items: [
        { label: "Supporters", href: "/dashboard/supporters", icon: Users },
        { label: "Payouts", href: "/dashboard/payouts", icon: Wallet },
      ],
    },
    {
      label: "Grow your page",
      items: [
        { label: "Posts", href: "/dashboard/posts", icon: FileText },
        { label: "Memberships", href: "/dashboard/tiers", icon: Crown },
        { label: "Shop", href: "/dashboard/shop", icon: Bag },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === `/${username}`) return false; // links to the public page
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:gap-0.5 md:overflow-visible md:py-4">
      {groups.map((group, gi) => (
        <div key={gi} className="contents md:block">
          {group.label ? (
            <p className="hidden px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-muted md:block">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <a
        href="/api/auth/logout"
        className="flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink md:hidden"
      >
        Log out
      </a>
    </nav>
  );
}
