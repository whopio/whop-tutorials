"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TOOLS } from "@/constants/categories";
import { ToolIcon } from "@/components/ToolIcon";

const NAV_TOOLS = TOOLS.filter((t) => t.value !== "OTHER");

export function NavToolBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const onTemplatesPage = pathname?.startsWith("/templates") ?? false;
  const activeTool = onTemplatesPage ? params?.get("tool") : null;

  const buildHref = (toolValue: string | null) => {
    const next = new URLSearchParams();
    const q = params?.get("q");
    if (q) next.set("q", q);
    if (toolValue) next.set("tool", toolValue);
    const qs = next.toString();
    return `/templates${qs ? `?${qs}` : ""}`;
  };

  return (
    <nav
      aria-label="Browse by tool"
      className="border-b border-[var(--color-border)] bg-[var(--color-background)]/85 backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="no-scrollbar -mx-4 flex gap-0 overflow-x-auto px-4 sm:mx-0 sm:gap-1 sm:px-0">
          <ToolTab href={buildHref(null)} active={onTemplatesPage && !activeTool}>
            All templates
          </ToolTab>
          {NAV_TOOLS.map((tool) => {
            const isActive = activeTool === tool.value;
            return (
              <ToolTab
                key={tool.value}
                href={buildHref(tool.value)}
                active={isActive}
                color={`var(${tool.cssVar})`}
                icon={<ToolIcon tool={tool.value} className="h-3.5 w-3.5" />}
              >
                {tool.label}
              </ToolTab>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function ToolTab({
  href,
  active,
  color,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  color?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`group relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm transition ${
        active
          ? "font-semibold text-[var(--color-text-primary)]"
          : "font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      }`}
      style={active && color ? { color } : undefined}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded-t transition ${
          active ? "opacity-100" : "opacity-0 group-hover:opacity-30"
        }`}
        style={active ? { backgroundColor: color ?? "var(--color-accent)" } : { backgroundColor: "var(--color-text-primary)" }}
      />
    </Link>
  );
}
