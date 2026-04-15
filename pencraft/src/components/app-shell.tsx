"use client";

import { useState, createContext, useContext, type ReactNode } from "react";

interface AppState {
  selectedGenerationId: string | null;
  selectedTemplateSlug: string | null;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  upgradeModalOpen: boolean;
  limitModalOpen: boolean;
  generationsRemaining: number;
}

interface AppContextType extends AppState {
  selectGeneration: (id: string | null) => void;
  selectTemplate: (slug: string | null) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  openLimitModal: () => void;
  closeLimitModal: () => void;
  setGenerationsRemaining: (n: number) => void;
  isAtLimit: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppShell");
  return ctx;
}

export function AppShell({
  header,
  leftSidebar,
  centerPanel,
  rightSidebar,
  upgradeModal,
  limitModal,
  initialRemaining,
}: {
  header: ReactNode;
  leftSidebar: ReactNode;
  centerPanel: ReactNode;
  rightSidebar: ReactNode;
  upgradeModal: ReactNode;
  limitModal: ReactNode;
  initialRemaining: number;
}) {
  const [state, setState] = useState<AppState>({
    selectedGenerationId: null,
    selectedTemplateSlug: null,
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    upgradeModalOpen: false,
    limitModalOpen: false,
    generationsRemaining: initialRemaining,
  });

  const isAtLimit = state.generationsRemaining <= 0;

  const ctx: AppContextType = {
    ...state,
    isAtLimit,
    selectGeneration: (id) =>
      setState((s) => ({ ...s, selectedGenerationId: id, rightSidebarOpen: id ? false : s.rightSidebarOpen })),
    selectTemplate: (slug) =>
      setState((s) => ({ ...s, selectedTemplateSlug: slug, rightSidebarOpen: true })),
    toggleLeftSidebar: () =>
      setState((s) => ({ ...s, leftSidebarOpen: !s.leftSidebarOpen })),
    toggleRightSidebar: () =>
      setState((s) => ({ ...s, rightSidebarOpen: !s.rightSidebarOpen })),
    openUpgradeModal: () =>
      setState((s) => ({ ...s, upgradeModalOpen: true })),
    closeUpgradeModal: () =>
      setState((s) => ({ ...s, upgradeModalOpen: false })),
    openLimitModal: () =>
      setState((s) => ({ ...s, limitModalOpen: true })),
    closeLimitModal: () =>
      setState((s) => ({ ...s, limitModalOpen: false })),
    setGenerationsRemaining: (n) =>
      setState((s) => ({ ...s, generationsRemaining: n })),
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="flex h-dvh flex-col overflow-hidden">
        {header}
        <div className="flex flex-1 overflow-hidden">
          <aside
            className={`flex-shrink-0 border-r border-border bg-surface overflow-y-auto transition-all duration-200 ${
              state.leftSidebarOpen ? "w-64" : "w-0"
            }`}
          >
            {state.leftSidebarOpen && leftSidebar}
          </aside>

          <main className="flex-1 overflow-y-auto">
            {centerPanel}
          </main>

          <aside
            className={`flex-shrink-0 border-l border-border bg-surface overflow-y-auto transition-all duration-200 ${
              state.rightSidebarOpen ? "w-[40rem]" : "w-0"
            }`}
          >
            {state.rightSidebarOpen && rightSidebar}
          </aside>
        </div>
      </div>

      {state.upgradeModalOpen && upgradeModal}
      {state.limitModalOpen && limitModal}
    </AppContext.Provider>
  );
}
