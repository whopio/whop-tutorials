"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MINI_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-12 items-stretch border-t border-border bg-canvas lg:hidden">
      {MINI_NAV.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px]",
              active ? "text-fg" : "text-fg-muted",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
