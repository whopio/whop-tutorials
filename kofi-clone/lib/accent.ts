// Whop's embedded components accept a curated accent palette (not arbitrary hex).
// We expose the same names so the page accent matches the checkout/payout widgets.
export const ACCENT_OPTIONS = [
  { name: "sky", hex: "#0ea5e9" },
  { name: "blue", hex: "#3b82f6" },
  { name: "cyan", hex: "#06b6d4" },
  { name: "teal", hex: "#14b8a6" },
  { name: "jade", hex: "#10b981" },
  { name: "green", hex: "#22c55e" },
  { name: "grass", hex: "#65a30d" },
  { name: "pink", hex: "#ec4899" },
  { name: "crimson", hex: "#e11d48" },
  { name: "tomato", hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "amber", hex: "#f59e0b" },
  { name: "purple", hex: "#a855f7" },
  { name: "violet", hex: "#8b5cf6" },
  { name: "indigo", hex: "#6366f1" },
  { name: "gold", hex: "#ca8a04" },
] as const;

export type AccentName = (typeof ACCENT_OPTIONS)[number]["name"];

const HEX_BY_NAME = new Map<string, string>(ACCENT_OPTIONS.map((a) => [a.name, a.hex] as [string, string]));

export const DEFAULT_ACCENT: AccentName = "sky";

export function accentHex(name: string | null | undefined): string {
  if (!name) return HEX_BY_NAME.get(DEFAULT_ACCENT)!;
  return HEX_BY_NAME.get(name) ?? HEX_BY_NAME.get(DEFAULT_ACCENT)!;
}

export function isAccentName(name: string): name is AccentName {
  return HEX_BY_NAME.has(name);
}
