"use client";

import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/session";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { TopBar } from "./top-bar";
import { GuideSidebar, MobileDrawer, type GuideChannel } from "./guide-sidebar";
import { MobileBottomNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

function Main({ children }: { children: ReactNode }) {
  const { pinned } = useSidebar();
  return (
    <main
      className={cn(
        "min-h-[calc(100vh-3.5rem)] pt-14 pb-16 transition-[margin] duration-150 lg:pb-0",
        pinned ? "lg:ml-60" : "lg:ml-[72px]",
      )}
    >
      <div className="px-4 py-4 sm:px-6">{children}</div>
    </main>
  );
}

export function AppShell({
  children,
  user,
  subscriptions,
}: {
  children: ReactNode;
  user: SessionUser | null;
  subscriptions: GuideChannel[];
}) {
  return (
    <SidebarProvider>
      <TopBar user={user} />
      <GuideSidebar subscriptions={subscriptions} />
      <MobileDrawer subscriptions={subscriptions} />
      <Main>{children}</Main>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
