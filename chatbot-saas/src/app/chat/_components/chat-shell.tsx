"use client";

import { createContext, useContext, useState } from "react";

const SidebarToggleContext = createContext<() => void>(() => {});
export const useSidebarToggle = () => useContext(SidebarToggleContext);

export function ChatShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarToggleContext.Provider value={() => setSidebarOpen((o) => !o)}>
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-200 md:relative md:z-auto md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </SidebarToggleContext.Provider>
  );
}
