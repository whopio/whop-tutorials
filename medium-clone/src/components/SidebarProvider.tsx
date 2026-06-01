"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Sidebar state — desktop `collapsed` toggles the sidebar between visible
 * (240px column) and fully hidden (0px, slid off-screen). Persisted via the
 * `sidebar_collapsed` cookie so SSR can apply the right CSS variable on first
 * paint (see `AppShell`). Mobile `mobileOpen` (drawer) is ephemeral and always
 * starts closed.
 */
interface SidebarCtx {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const Ctx = createContext<SidebarCtx | null>(null);

const SIDEBAR_W_VISIBLE = "240px";
const SIDEBAR_W_HIDDEN = "0px";

export function SidebarProvider({
  children,
  initialCollapsed,
}: {
  children: React.ReactNode;
  initialCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open. We toggle a class on
  // <body> instead of mutating inline style, because className changes batch
  // into the next paint cycle — inline style writes can force a layout flush.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.classList.add("scroll-locked");
    return () => document.body.classList.remove("scroll-locked");
  }, [mobileOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      // Persist a year. Lax cookie is fine — purely UI preference, no auth weight.
      document.cookie = `sidebar_collapsed=${next ? "1" : "0"}; path=/; max-age=${
        60 * 60 * 24 * 365
      }; SameSite=Lax`;
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // The CSS variable lives on the wrapper this provider renders. React
  // re-renders the inline style whenever `collapsed` flips, which is what
  // drives the smooth main-content padding transition. (Setting it on
  // `document.documentElement` from a useEffect would be overridden by any
  // closer ancestor that also defines `--sidebar-w`.)
  const sidebarWidth = collapsed ? SIDEBAR_W_HIDDEN : SIDEBAR_W_VISIBLE;

  return (
    <Ctx.Provider value={{ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile }}>
      <div style={{ ["--sidebar-w" as string]: sidebarWidth }}>{children}</div>
    </Ctx.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}
