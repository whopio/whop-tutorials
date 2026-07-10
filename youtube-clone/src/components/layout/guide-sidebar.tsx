"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PRIMARY_NAV,
  YOU_NAV,
  EXPLORE_NAV,
  MINI_NAV,
  type NavItem,
} from "@/lib/constants";
import { Menu, User } from "lucide-react";
import { WavoraLogo } from "@/components/ui/wavora-logo";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

export type GuideChannel = {
  handle: string;
  name: string;
  avatarUrl: string | null;
};

/** A link is active when its path matches and, if it carries query params
 * (Watch later vs Liked are both /playlist), those match too. */
function isActive(pathname: string, search: URLSearchParams, href: string) {
  const [base, query] = href.split("?");
  const baseMatch = base === "/" ? pathname === "/" : pathname.startsWith(base);
  if (!baseMatch) return false;
  if (!query) return true;
  return [...new URLSearchParams(query)].every(([k, v]) => search.get(k) === v);
}

function GuideLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-10 items-center gap-6 rounded-lg px-3 hover:bg-hover",
        active && "bg-hover font-medium",
      )}
    >
      <Icon className="h-6 w-6 shrink-0" strokeWidth={active ? 2 : 1.6} />
      <span className="truncate text-sm">{item.label}</span>
    </Link>
  );
}

function Section({
  title,
  items,
  pathname,
  search,
  onNavigate,
}: {
  title?: string;
  items: NavItem[];
  pathname: string;
  search: URLSearchParams;
  onNavigate?: () => void;
}) {
  return (
    <div className="border-b border-border py-3">
      {title && <h3 className="mb-1 px-3 text-base font-medium">{title}</h3>}
      <nav className="flex flex-col gap-0.5">
        {items.map((i) => (
          <GuideLink
            key={i.label}
            item={i}
            active={isActive(pathname, search, i.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}

function MiniRail({
  pathname,
  search,
}: {
  pathname: string;
  search: URLSearchParams;
}) {
  return (
    <nav className="flex flex-col items-center gap-1 py-1">
      {MINI_NAV.map((i) => {
        const Icon = i.icon;
        const active = isActive(pathname, search, i.href);
        return (
          <Link
            key={i.label}
            href={i.href}
            className={cn(
              "flex w-16 flex-col items-center gap-1 rounded-lg py-4 hover:bg-hover",
              active && "bg-hover",
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={1.6} />
            <span className="text-[10px] leading-none">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** LIB-13: the viewer's subscribed channels in the guide. */
function SubscriptionsSection({
  channels,
  onNavigate,
}: {
  channels: GuideChannel[];
  onNavigate?: () => void;
}) {
  if (channels.length === 0) return null;
  return (
    <div className="border-b border-border py-3">
      <h3 className="mb-1 px-3 text-base font-medium">Subscriptions</h3>
      <nav className="flex flex-col gap-0.5">
        {channels.map((c) => (
          <Link
            key={c.handle}
            href={`/@${c.handle}`}
            onClick={onNavigate}
            className="flex h-10 items-center gap-3 rounded-lg px-3 hover:bg-hover"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-hover">
              {c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-fg-muted" />
              )}
            </span>
            <span className="truncate text-sm">{c.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function GuideSidebar({
  subscriptions,
}: {
  subscriptions: GuideChannel[];
}) {
  const { pinned } = useSidebar();
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();
  const expanded = pinned || hovered;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] bg-canvas transition-[width] duration-150 lg:block",
        expanded ? "w-60 overflow-y-auto px-3 pb-6" : "w-[72px] overflow-hidden",
        hovered && !pinned && "border-r border-border shadow-xl",
      )}
    >
      {expanded ? (
        <>
          <Section items={PRIMARY_NAV} pathname={pathname} search={search} />
          <Section title="You" items={YOU_NAV} pathname={pathname} search={search} />
          <SubscriptionsSection channels={subscriptions} />
          <Section title="Explore" items={EXPLORE_NAV} pathname={pathname} search={search} />
          <p className="px-3 pt-4 text-xs text-fg-muted">© 2026 Wavora</p>
        </>
      ) : (
        <MiniRail pathname={pathname} search={search} />
      )}
    </aside>
  );
}

/**
 * DESIGN-5 (mobile): the slide-in guide drawer for < lg viewports, driven by the
 * top-bar hamburger (mobileOpen). Tapping a link, the backdrop, or the close
 * button dismisses it.
 */
export function MobileDrawer({
  subscriptions,
}: {
  subscriptions: GuideChannel[];
}) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const search = useSearchParams();
  const close = () => setMobileOpen(false);

  if (!mobileOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <aside className="absolute left-0 top-0 h-full w-60 max-w-[80vw] overflow-y-auto bg-canvas px-3 pb-6 shadow-xl">
        <div className="mb-1 flex h-14 items-center gap-3 px-1">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-hover"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/" onClick={close} aria-label="Wavora home">
            <WavoraLogo />
          </Link>
        </div>
        <Section items={PRIMARY_NAV} pathname={pathname} search={search} onNavigate={close} />
        <Section
          title="You"
          items={YOU_NAV}
          pathname={pathname}
          search={search}
          onNavigate={close}
        />
        <SubscriptionsSection channels={subscriptions} onNavigate={close} />
        <Section
          title="Explore"
          items={EXPLORE_NAV}
          pathname={pathname}
          search={search}
          onNavigate={close}
        />
      </aside>
    </div>
  );
}
