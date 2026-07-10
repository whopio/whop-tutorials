"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarState = {
  /** Desktop: the guide is pinned open (otherwise it's a slim rail that
   * expands on hover). */
  pinned: boolean;
  toggle: () => void;
  /** Mobile drawer open state. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        pinned,
        toggle: () => setPinned((p) => !p),
        mobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
