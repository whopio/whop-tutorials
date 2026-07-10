"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** CHANNEL-4: the channel tab strip, each tab routing to its own URL segment. */
export function ChannelTabs({
  handle,
  showShorts,
  showMembership,
}: {
  handle: string;
  showShorts?: boolean;
  showMembership?: boolean;
}) {
  const pathname = decodeURIComponent(usePathname());
  const base = `/@${handle}`;
  const tabs = [
    { label: "Home", href: base },
    { label: "Videos", href: `${base}/videos` },
    ...(showShorts ? [{ label: "Waves", href: `${base}/waves` }] : []),
    ...(showMembership
      ? [{ label: "Membership", href: `${base}/membership` }]
      : []),
    { label: "About", href: `${base}/about` },
  ];

  return (
    <div className="sticky top-14 z-20 mb-4 flex gap-6 border-b border-border bg-canvas">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={cn(
              "border-b-2 py-3 text-sm font-medium",
              active
                ? "border-fg text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
