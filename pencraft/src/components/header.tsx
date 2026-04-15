"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "./app-shell";

type Theme = "light" | "dark" | "system";

function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("pencraft-theme") as Theme) || "system";
}

function applyTheme(theme: Theme) {
  localStorage.setItem("pencraft-theme", theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function Header({
  user,
  tier,
}: {
  user: { name: string | null; email: string };
  tier: "FREE" | "PRO";
}) {
  const { toggleLeftSidebar, toggleRightSidebar, openUpgradeModal } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getTheme());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  function handleTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLeftSidebar}
          className="rounded p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Toggle history sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
        </button>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 24" fill="none" className="h-5 w-auto text-text-primary">
          <path d="M2 20 L5 4 L8 4 L11 12 L10 4 L13 4 L10 20 L7 20 L4 12 L5 20 Z" fill="#6366f1"/>
          <text x="18" y="18" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="700" fill="currentColor" letterSpacing="-0.03em">pencraft</text>
        </svg>
      </div>

      <div className="flex items-center gap-2">
        {tier === "PRO" && (
          <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
            Pro
          </span>
        )}
        <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
              >
                {user.name || user.email}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-surface shadow-lg z-50">
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-text-muted mb-1.5">Theme</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleTheme("light")}
                        className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          theme === "light"
                            ? "bg-accent text-white"
                            : "text-text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                        Light
                      </button>
                      <button
                        onClick={() => handleTheme("dark")}
                        className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          theme === "dark"
                            ? "bg-accent text-white"
                            : "text-text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                        Dark
                      </button>
                      <button
                        onClick={() => handleTheme("system")}
                        className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          theme === "system"
                            ? "bg-accent text-white"
                            : "text-text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                        Auto
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-border">
                    {tier === "FREE" && (
                      <button
                        onClick={() => { setDropdownOpen(false); openUpgradeModal(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                        Upgrade to Pro
                      </button>
                    )}
                    <a
                      href="/api/auth/logout"
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign out
                    </a>
                  </div>
                </div>
              )}
            </div>
        <button
          onClick={toggleRightSidebar}
          className="rounded p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Toggle templates sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>
        </button>
      </div>
    </header>
  );
}
