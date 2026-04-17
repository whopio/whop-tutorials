"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckoutPopup } from "./checkout-popup";
import { WelcomePopup } from "./welcome-popup";

interface AppState {
  selectedGenerationId: string | null;
  selectedTemplateSlug: string | null;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  upgradeModalOpen: boolean;
  limitModalOpen: boolean;
  checkoutPopupOpen: boolean;
  welcomePopupOpen: boolean;
  processingUpgrade: boolean;
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
  openCheckoutPopup: () => void;
  closeCheckoutPopup: () => void;
  closeWelcomePopup: () => void;
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
  proWhopPlanId,
  checkoutEnvironment,
  autoOpenCheckout,
}: {
  header: ReactNode;
  leftSidebar: ReactNode;
  centerPanel: ReactNode;
  rightSidebar: ReactNode;
  upgradeModal: ReactNode;
  limitModal: ReactNode;
  initialRemaining: number;
  proWhopPlanId: string | null;
  checkoutEnvironment: "sandbox" | "production";
  autoOpenCheckout?: boolean;
}) {
  const router = useRouter();

  const [state, setState] = useState<AppState>({
    selectedGenerationId: null,
    selectedTemplateSlug: null,
    leftSidebarOpen: false,
    rightSidebarOpen: false,
    upgradeModalOpen: false,
    limitModalOpen: false,
    checkoutPopupOpen: false,
    welcomePopupOpen: false,
    processingUpgrade: false,
    generationsRemaining: initialRemaining,
  });

  // Open sidebars on desktop, keep closed on mobile
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setState((s) => ({ ...s, leftSidebarOpen: true, rightSidebarOpen: true }));
    }
  }, []);

  // Auto-open checkout on mount (from ?upgrade=true redirect)
  useEffect(() => {
    if (autoOpenCheckout && proWhopPlanId) {
      setState((s) => ({ ...s, checkoutPopupOpen: true }));
    }
  }, [autoOpenCheckout, proWhopPlanId]);

  // Auto-open welcome popup on mount (from ?welcome=true redirect)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "true") {
        setState((s) => ({ ...s, welcomePopupOpen: true }));
        // Clean the URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const handleCheckoutComplete = useCallback(() => {
    setState((s) => ({ ...s, checkoutPopupOpen: false, processingUpgrade: true }));
    setTimeout(() => {
      router.refresh();
      setState((s) => ({ ...s, processingUpgrade: false, welcomePopupOpen: true }));
    }, 3000);
  }, [router]);

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
    openCheckoutPopup: () =>
      setState((s) => ({ ...s, checkoutPopupOpen: true })),
    closeCheckoutPopup: () =>
      setState((s) => ({ ...s, checkoutPopupOpen: false })),
    closeWelcomePopup: () =>
      setState((s) => ({ ...s, welcomePopupOpen: false })),
    setGenerationsRemaining: (n) =>
      setState((s) => ({ ...s, generationsRemaining: n })),
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="flex h-dvh flex-col overflow-hidden">
        {header}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Left sidebar — overlay on mobile, inline on md+ */}
          {state.leftSidebarOpen && (
            <div
              className="absolute inset-0 z-10 bg-black/40 md:hidden"
              onClick={() => setState((s) => ({ ...s, leftSidebarOpen: false }))}
            />
          )}
          <aside
            className={`flex-shrink-0 border-r border-border bg-surface overflow-y-auto transition-all duration-200 ${
              state.leftSidebarOpen
                ? "absolute inset-y-0 left-0 z-20 w-[280px] md:relative md:w-64 md:z-auto"
                : "w-0"
            }`}
          >
            {state.leftSidebarOpen && leftSidebar}
          </aside>

          <main className="flex-1 overflow-y-auto">
            {centerPanel}
          </main>

          {/* Right sidebar — overlay on mobile, inline on md+ */}
          {state.rightSidebarOpen && (
            <div
              className="absolute inset-0 z-10 bg-black/40 md:hidden"
              onClick={() => setState((s) => ({ ...s, rightSidebarOpen: false }))}
            />
          )}
          <aside
            className={`flex-shrink-0 border-l border-border bg-surface overflow-y-auto transition-all duration-200 ${
              state.rightSidebarOpen
                ? "absolute inset-y-0 right-0 z-20 w-full max-w-[340px] md:relative md:w-[40rem] md:max-w-none md:z-auto"
                : "w-0"
            }`}
          >
            {state.rightSidebarOpen && rightSidebar}
          </aside>
        </div>
      </div>

      {state.upgradeModalOpen && upgradeModal}
      {state.limitModalOpen && limitModal}

      {state.checkoutPopupOpen && proWhopPlanId && (
        <CheckoutPopup
          planId={proWhopPlanId}
          environment={checkoutEnvironment}
          onClose={() => setState((s) => ({ ...s, checkoutPopupOpen: false }))}
          onComplete={handleCheckoutComplete}
        />
      )}

      {state.welcomePopupOpen && (
        <WelcomePopup onClose={() => setState((s) => ({ ...s, welcomePopupOpen: false }))} />
      )}

      {state.processingUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-sm font-medium text-white">Setting up your Pro account...</p>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}
