"use client";

import { Text } from "@whop/react/components";

// The eight named theme presets from Whop's official chat playground. The
// hex values are sampled from the real chat element's own-message bubbles
// (one per preset), so our REST-rendered panel matches it exactly; fg is
// the bubble text color (the mint and amber accents take dark text).
export const PRESETS = [
  { name: "ocean", accent: "blue", hex: "#1754D8", fg: "#FFFFFF", warnHex: "#FFA057" },
  { name: "plum", accent: "purple", hex: "#8E4EC6", fg: "#FFFFFF", warnHex: "#D19DFF" },
  { name: "forest", accent: "green", hex: "#30A46C", fg: "#FFFFFF", warnHex: "#FFA057" },
  { name: "sunset", accent: "orange", hex: "#FA4616", fg: "#FFFFFF", warnHex: "#F5D90A" },
  { name: "lavender", accent: "indigo", hex: "#6318F8", fg: "#FFFFFF", warnHex: "#D19DFF" },
  { name: "mint", accent: "mint", hex: "#86EAD4", fg: "#1A211E", warnHex: "#FFA057" },
  { name: "ruby", accent: "red", hex: "#FD1D1D", fg: "#FFFFFF", warnHex: "#FFA057" },
  { name: "amber", accent: "amber", hex: "#FFC53D", fg: "#21201C", warnHex: "#F5D90A" },
] as const;

export type PresetName = (typeof PRESETS)[number]["name"];

export function getPreset(name: string) {
  return PRESETS.find((p) => p.name === name) ?? PRESETS[3]; // sunset default
}

export function accentHex(presetName: string): string {
  return getPreset(presetName).hex;
}

export function accentFg(presetName: string): string {
  return getPreset(presetName).fg;
}

export type ThemeState = {
  appearance: "light" | "dark";
  preset: PresetName;
  chatStyle: "imessage" | "discord";
};

export function ThemeControls({
  theme,
  onChange,
}: {
  theme: ThemeState;
  onChange: (patch: Partial<ThemeState>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Text size="1" color="gray" as="div" className="mb-1.5">
          Theme preset
        </Text>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => {
            const selected = theme.preset === p.name;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onChange({ preset: p.name })}
                title={p.name}
                className={[
                  "flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition",
                  selected
                    ? "border-[#151515] bg-white shadow-sm"
                    : "border-[#E5E4E0] bg-white/60 hover:border-[#151515]/30",
                ].join(" ")}
              >
                <span className="relative h-5 w-5">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white"
                    style={{ backgroundColor: p.warnHex }}
                  />
                </span>
                <span className="text-[10px] capitalize text-[#151515]/80">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <Text size="1" color="gray" as="div" className="mb-1.5">
            Appearance
          </Text>
          <Segmented
            value={theme.appearance}
            options={[
              ["light", "Light"],
              ["dark", "Dark"],
            ]}
            onSelect={(v) => onChange({ appearance: v as ThemeState["appearance"] })}
          />
        </div>
        <div>
          <Text size="1" color="gray" as="div" className="mb-1.5">
            Style
          </Text>
          <Segmented
            value={theme.chatStyle}
            options={[
              ["imessage", "iMessage"],
              ["discord", "Discord"],
            ]}
            onSelect={(v) => onChange({ chatStyle: v as ThemeState["chatStyle"] })}
          />
        </div>
      </div>
    </div>
  );
}

function Segmented({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: Array<[string, string]>;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#E5E4E0] bg-white p-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={[
            "rounded-md px-2.5 py-1 text-xs font-medium transition",
            value === key ? "bg-[#151515] text-white" : "text-[#151515]/70",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
