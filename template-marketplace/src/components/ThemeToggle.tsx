"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

const ORDER = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof ORDER)[number];

function nextTheme(choice: ThemeChoice): ThemeChoice {
  return ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
}

function asChoice(theme: string | undefined): ThemeChoice {
  return theme === "light" || theme === "dark" ? theme : "system";
}

const LABELS: Record<ThemeChoice, string> = {
  system: "Theme: system. Switch to light",
  light: "Theme: light. Switch to dark",
  dark: "Theme: dark. Switch to system",
};

const ICONS: Record<ThemeChoice, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration-safe theme-toggle pattern
  useEffect(() => setMounted(true), []);

  const choice = asChoice(theme);
  const Icon = ICONS[choice];

  return (
    <button
      type="button"
      aria-label={mounted ? LABELS[choice] : "Theme toggle"}
      title={mounted ? LABELS[choice] : undefined}
      onClick={() => setTheme(nextTheme(choice))}
      className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
    >
      {mounted ? (
        <Icon className="h-4 w-4" />
      ) : (
        <span className="block h-4 w-4" />
      )}
    </button>
  );
}
