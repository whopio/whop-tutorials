"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./SidebarProvider";

/**
 * Single visual button, two responsive behaviors:
 *   mobile (< lg) → opens the off-canvas sidebar drawer
 *   desktop (lg+) → toggles the sidebar between visible (240px) and hidden
 *
 * Two underlying <button>s with responsive visibility keeps the handlers
 * pure (no viewport sniffing) and avoids hydration warnings.
 */
export function HamburgerButton() {
  const { openMobile, toggleCollapsed, collapsed } = useSidebar();
  return (
    <>
      <button
        type="button"
        onClick={openMobile}
        aria-label="Open navigation"
        className="lg:hidden inline-flex items-center justify-center size-9 rounded-full text-text-secondary hover:bg-surface hover:text-text-primary"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
        aria-pressed={!collapsed}
        className="hidden lg:inline-flex items-center justify-center size-9 rounded-full text-text-secondary hover:bg-surface hover:text-text-primary"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
    </>
  );
}
