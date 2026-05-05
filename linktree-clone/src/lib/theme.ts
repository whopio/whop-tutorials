// Editorial Mono accent palette. Each entry is WCAG AA compliant against a
// white background at body-text sizes (>= 4.5:1 contrast ratio). The label
// is what the user sees in the picker; the key is what we store in the DB.

export type AccentKey =
  | "violet"
  | "indigo"
  | "forest"
  | "crimson"
  | "slate"
  | "tangerine";

export interface Accent {
  key: AccentKey;
  label: string;
  hex: string;
  // Pre-computed contrast ratio against white, for documentation.
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

export function resolveAccent(key: string | null | undefined): Accent {
  if (key && ACCENT_BY_KEY[key]) return ACCENT_BY_KEY[key];
  return ACCENT_BY_KEY[DEFAULT_ACCENT_KEY];
}

// The CSS custom properties we expose to descendant components.
// Set on a wrapper element via inline style.
export function accentVars(accent: Accent): React.CSSProperties {
  return {
    "--accent": accent.hex,
    "--accent-bg": `${accent.hex}14`, // ~8% opacity tint for soft surfaces
    "--accent-border": `${accent.hex}33`, // ~20% opacity for hairlines
  } as React.CSSProperties;
}
