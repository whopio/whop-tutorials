// Theme primitives shared across the public profile and the dashboard
// live preview. Six accent colors, six card-style presets, and a set of
// background presets (solid + gradients). All values were chosen to keep
// link card text at >= 4.5:1 contrast against the card surface.

export type AccentKey =
  | "violet"
  | "indigo"
  | "forest"
  | "crimson"
  | "slate"
  | "tangerine";

export interface Accent {
  key: AccentKey | string;
  label: string;
  hex: string;
  contrastOnWhite: number;
}

export const ACCENTS: readonly Accent[] = [
  { key: "violet", label: "Violet", hex: "#7c3aed", contrastOnWhite: 5.93 },
  { key: "indigo", label: "Indigo", hex: "#4338ca", contrastOnWhite: 8.73 },
  { key: "forest", label: "Forest", hex: "#15803d", contrastOnWhite: 4.69 },
  { key: "crimson", label: "Crimson", hex: "#be123c", contrastOnWhite: 6.49 },
  { key: "slate", label: "Slate", hex: "#1e293b", contrastOnWhite: 15.59 },
  {
    key: "tangerine",
    label: "Tangerine",
    hex: "#c2410c",
    contrastOnWhite: 4.97,
  },
] as const;

const ACCENT_BY_KEY: Record<string, Accent> = Object.fromEntries(
  ACCENTS.map((a) => [a.key, a])
);

export const DEFAULT_ACCENT_KEY: AccentKey = "violet";

const HEX_REGEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_REGEX.test(value.trim());
}

export function resolveAccent(key: string | null | undefined): Accent {
  if (!key) return ACCENT_BY_KEY[DEFAULT_ACCENT_KEY];
  if (ACCENT_BY_KEY[key]) return ACCENT_BY_KEY[key];
  if (isHexColor(key)) {
    return { key, label: "Custom", hex: key, contrastOnWhite: 0 };
  }
  return ACCENT_BY_KEY[DEFAULT_ACCENT_KEY];
}

export function accentVars(accent: Accent): React.CSSProperties {
  return {
    "--accent": accent.hex,
    "--accent-bg": `${accent.hex}14`,
    "--accent-border": `${accent.hex}33`,
  } as React.CSSProperties;
}

// ---------- Card styles ----------

export type CardStyleKey =
  | "default"
  | "pill"
  | "square"
  | "soft"
  | "outline"
  | "elevated"
  | "wave";

export interface CardStyle {
  key: CardStyleKey;
  label: string;
}

export const CARD_STYLES: readonly CardStyle[] = [
  { key: "default", label: "Rounded" },
  { key: "pill", label: "Pill" },
  { key: "soft", label: "Soft" },
  { key: "square", label: "Square" },
  { key: "outline", label: "Outline" },
  { key: "elevated", label: "Elevated" },
  { key: "wave", label: "Wave" },
] as const;

export const DEFAULT_CARD_STYLE: CardStyleKey = "default";

export function isCardStyleKey(value: unknown): value is CardStyleKey {
  return CARD_STYLES.some((s) => s.key === value);
}

// ---------- Backgrounds ----------

export type BgKind = "auto" | "solid" | "gradient" | "preset";

export interface BgPreset {
  key: string;
  label: string;
  css: string; // background CSS value
  isDark: boolean; // hint for text auto-contrast
}

export const BG_PRESETS: readonly BgPreset[] = [
  { key: "white", label: "White", css: "#ffffff", isDark: false },
  { key: "cream", label: "Cream", css: "#fafaf9", isDark: false },
  { key: "stone", label: "Stone", css: "#e7e5e4", isDark: false },
  { key: "ink", label: "Ink", css: "#0a0a0c", isDark: true },
  {
    key: "lavender",
    label: "Lavender",
    css: "linear-gradient(135deg, #f3e8ff 0%, #fdf2f8 100%)",
    isDark: false,
  },
  {
    key: "peach",
    label: "Peach",
    css: "linear-gradient(135deg, #fff7ed 0%, #fee2e2 100%)",
    isDark: false,
  },
  {
    key: "mint",
    label: "Mint",
    css: "linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 100%)",
    isDark: false,
  },
  {
    key: "dusk",
    label: "Dusk",
    css: "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
    isDark: true,
  },
  {
    key: "horizon",
    label: "Horizon",
    css: "linear-gradient(135deg, #fef3c7 0%, #fda4af 60%, #c4b5fd 100%)",
    isDark: false,
  },
] as const;

const BG_PRESET_BY_KEY: Record<string, BgPreset> = Object.fromEntries(
  BG_PRESETS.map((b) => [b.key, b])
);

export function getBgPreset(key: string | null | undefined): BgPreset | null {
  if (!key) return null;
  return BG_PRESET_BY_KEY[key] ?? null;
}

export interface ResolvedBackground {
  css: string; // CSS value to assign to background
  isDark: boolean; // true when the background reads dark (text should be light)
}

// Resolve a stored (bgKind, bgValue) pair into a CSS background. The "auto"
// kind falls back to the page surface (transparent so the page bg shows
// through; downstream renderers can apply var(--background-alt) instead).
export function resolveBackground(
  kind: string | null | undefined,
  value: string | null | undefined
): ResolvedBackground {
  if (kind === "preset" && value) {
    const preset = getBgPreset(value);
    if (preset) return { css: preset.css, isDark: preset.isDark };
  }
  if (kind === "solid" && isHexColor(value)) {
    return { css: value as string, isDark: isHexDark(value as string) };
  }
  if (kind === "gradient" && typeof value === "string" && value.length > 0) {
    return { css: value, isDark: false };
  }
  // Auto: use the page surface (transparent — caller decides what shows
  // through).
  return { css: "transparent", isDark: false };
}

// ---------- Text color ----------

export interface ResolvedText {
  color: string; // CSS color for primary text
  muted: string; // CSS color for secondary text
}

const DARK_TEXT: ResolvedText = { color: "#0a0a0c", muted: "#525258" };
const LIGHT_TEXT: ResolvedText = { color: "#fafafa", muted: "#cbd5e1" };

export function resolveTextColor(
  stored: string | null | undefined,
  bgIsDark: boolean
): ResolvedText {
  if (stored && isHexColor(stored)) {
    return {
      color: stored,
      muted: hexWithAlpha(stored, 0.65),
    };
  }
  return bgIsDark ? LIGHT_TEXT : DARK_TEXT;
}

// ---------- Helpers ----------

export function isHexDark(hex: string): boolean {
  const value = hex.replace("#", "");
  if (value.length !== 6 && value.length !== 3) return false;
  const expand = (s: string) =>
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const v = expand(value);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  // sRGB luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
