"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="menuitem"
      suppressHydrationWarning
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center justify-between px-4 py-2 text-sm text-text-primary hover:bg-surface"
    >
      <span>Theme</span>
      <span
        suppressHydrationWarning
        className="inline-flex items-center gap-1.5 text-text-secondary text-xs"
      >
        {!mounted ? null : isDark ? (
          <>
            <Moon aria-hidden="true" className="size-3.5" /> Dark
          </>
        ) : (
          <>
            <Sun aria-hidden="true" className="size-3.5" /> Light
          </>
        )}
      </span>
    </button>
  );
}
