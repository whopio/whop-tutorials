"use client";

import { useState, useTransition } from "react";
import {
  setAccent,
  setBackground,
  setCardStyle,
  setTextColor,
} from "@/app/actions/creator";
import {
  ACCENTS,
  BG_PRESETS,
  CARD_STYLES,
  DEFAULT_ACCENT_KEY,
  type CardStyleKey,
} from "@/lib/theme";

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2";

interface Props {
  hasProfile: boolean;
  accentColor: string;
  cardStyle: CardStyleKey | string;
  bgKind: string;
  bgValue: string | null;
  textColor: string;
}

export function ThemePicker(props: Props) {
  return (
    <div className="space-y-6">
      <AccentSection
        current={props.accentColor}
        hasProfile={props.hasProfile}
      />
      <CardStyleSection
        current={props.cardStyle}
        hasProfile={props.hasProfile}
      />
      <BackgroundSection
        kind={props.bgKind}
        value={props.bgValue}
        hasProfile={props.hasProfile}
      />
      <TextColorSection
        current={props.textColor}
        hasProfile={props.hasProfile}
      />
    </div>
  );
}

// ---------- Accent (button) color ----------

function AccentSection({
  current,
  hasProfile,
}: {
  current: string;
  hasProfile: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(current);
  const [error, setError] = useState<string | null>(null);

  const isHex = /^#[0-9a-fA-F]{6}$/.test(optimistic);
  const customValue = isHex ? optimistic : "#000000";

  function update(next: string) {
    if (!hasProfile) {
      setError("Save your profile first.");
      return;
    }
    setError(null);
    setOptimistic(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("accent", next);
      const res = await setAccent({}, fd);
      if (res.error) {
        setError(res.error);
        setOptimistic(current);
      }
    });
  }

  return (
    <div>
      <p className={labelClass}>Accent / button color</p>
      <div className="flex flex-wrap items-center gap-2.5">
        {ACCENTS.map((a) => {
          const active = optimistic === a.key;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => update(a.key)}
              disabled={pending || !hasProfile}
              aria-label={a.label}
              aria-pressed={active}
              className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: a.hex }}
            >
              {active && (
                <span className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-neutral-900" />
              )}
            </button>
          );
        })}
        <label
          className={`relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-dashed border-neutral-300 text-xs font-semibold text-neutral-500 transition-colors hover:border-neutral-900 hover:text-neutral-900 ${
            hasProfile ? "" : "pointer-events-none opacity-40"
          }`}
          aria-label="Custom accent color"
          style={isHex ? { background: customValue } : undefined}
        >
          {!isHex && <span aria-hidden>+</span>}
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={customValue}
            onChange={(e) => update(e.target.value.toLowerCase())}
            disabled={!hasProfile || pending}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

// ---------- Card style ----------

function CardStyleSection({
  current,
  hasProfile,
}: {
  current: CardStyleKey | string;
  hasProfile: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(current);
  const [error, setError] = useState<string | null>(null);

  function update(next: string) {
    if (!hasProfile) {
      setError("Save your profile first.");
      return;
    }
    setError(null);
    setOptimistic(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("cardStyle", next);
      const res = await setCardStyle({}, fd);
      if (res.error) {
        setError(res.error);
        setOptimistic(current);
      }
    });
  }

  return (
    <div>
      <p className={labelClass}>Card style</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {CARD_STYLES.map((s) => {
          const active = optimistic === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => update(s.key)}
              disabled={pending || !hasProfile}
              aria-pressed={active}
              className={`flex flex-col items-center gap-2 rounded-lg border bg-white p-2.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? "border-neutral-900"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <CardStylePreview kind={s.key} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function CardStylePreview({ kind }: { kind: string }) {
  // Tiny illustration of the card style so users can scan options visually.
  const base =
    "h-3.5 w-full bg-white border border-neutral-300 flex items-center justify-center";
  const map: Record<string, string> = {
    default: `${base} rounded-md`,
    pill: `${base} rounded-full`,
    soft: `${base} rounded-sm`,
    square: `${base} rounded-none`,
    outline: `h-3.5 w-full bg-transparent border-2 border-neutral-400 rounded-md`,
    elevated: `${base} rounded-md shadow-md`,
    wave: `${base} rounded-md`,
  };
  return <span className={map[kind] ?? map.default} />;
}

// ---------- Background ----------

function BackgroundSection({
  kind,
  value,
  hasProfile,
}: {
  kind: string;
  value: string | null;
  hasProfile: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optKind, setOptKind] = useState(kind);
  const [optValue, setOptValue] = useState<string | null>(value);
  const [error, setError] = useState<string | null>(null);

  const customHex =
    optKind === "solid" && optValue && /^#[0-9a-fA-F]{6}$/.test(optValue)
      ? optValue
      : "#fafaf9";

  function submit(nextKind: string, nextValue: string | null) {
    if (!hasProfile) {
      setError("Save your profile first.");
      return;
    }
    setError(null);
    setOptKind(nextKind);
    setOptValue(nextValue);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("kind", nextKind);
      if (nextValue !== null) fd.append("value", nextValue);
      const res = await setBackground({}, fd);
      if (res.error) {
        setError(res.error);
        setOptKind(kind);
        setOptValue(value);
      }
    });
  }

  return (
    <div>
      <p className={labelClass}>Background</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <SwatchButton
          label="Auto"
          background="repeating-linear-gradient(45deg, #f5f5f4 0 6px, #e7e5e4 6px 12px)"
          active={optKind === "auto"}
          disabled={!hasProfile || pending}
          onClick={() => submit("auto", null)}
        />
        {BG_PRESETS.map((p) => (
          <SwatchButton
            key={p.key}
            label={p.label}
            background={p.css}
            active={optKind === "preset" && optValue === p.key}
            disabled={!hasProfile || pending}
            onClick={() => submit("preset", p.key)}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label
          className={`inline-flex items-center gap-2 cursor-pointer text-xs text-neutral-600 ${
            hasProfile ? "" : "pointer-events-none opacity-40"
          }`}
        >
          <span
            className="inline-block h-6 w-6 rounded border border-neutral-200"
            style={{ background: customHex }}
            aria-hidden
          />
          <span>Custom solid color</span>
          <input
            type="color"
            className="sr-only"
            value={customHex}
            onChange={(e) => submit("solid", e.target.value.toLowerCase())}
            disabled={!hasProfile || pending}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function SwatchButton({
  label,
  background,
  active,
  disabled,
  onClick,
}: {
  label: string;
  background: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex flex-col items-center gap-1.5 rounded-lg border bg-white p-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "border-neutral-900"
          : "border-neutral-200 hover:border-neutral-400"
      }`}
    >
      <span
        className="h-7 w-full rounded-md border border-neutral-200"
        style={{ background }}
        aria-hidden
      />
      <span className="text-neutral-700">{label}</span>
    </button>
  );
}

// ---------- Text color ----------

function TextColorSection({
  current,
  hasProfile,
}: {
  current: string;
  hasProfile: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(current);
  const [error, setError] = useState<string | null>(null);

  const isHex = /^#[0-9a-fA-F]{6}$/.test(optimistic);
  const customValue = isHex ? optimistic : "#0a0a0c";

  function update(next: string) {
    if (!hasProfile) {
      setError("Save your profile first.");
      return;
    }
    setError(null);
    setOptimistic(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("textColor", next);
      const res = await setTextColor({}, fd);
      if (res.error) {
        setError(res.error);
        setOptimistic(current);
      }
    });
  }

  const presets: { key: string; label: string; preview: string }[] = [
    { key: "auto", label: "Auto", preview: "linear-gradient(135deg,#0a0a0c 50%,#fafafa 50%)" },
    { key: "#0a0a0c", label: "Black", preview: "#0a0a0c" },
    { key: "#fafafa", label: "White", preview: "#fafafa" },
    { key: "#525258", label: "Gray", preview: "#525258" },
  ];

  return (
    <div>
      <p className={labelClass}>Text color</p>
      <div className="flex items-center gap-2.5">
        {presets.map((p) => {
          const active = optimistic.toLowerCase() === p.key.toLowerCase();
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => update(p.key)}
              disabled={pending || !hasProfile}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? "border-neutral-900"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <span
                className="inline-block h-4 w-4 rounded-full border border-neutral-200"
                style={{ background: p.preview }}
                aria-hidden
              />
              <span>{p.label}</span>
            </button>
          );
        })}
        <label
          className={`relative inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors hover:border-neutral-900 ${
            hasProfile ? "" : "pointer-events-none opacity-40"
          }`}
          aria-label="Custom text color"
        >
          <span
            className="inline-block h-4 w-4 rounded-full border border-neutral-200"
            style={isHex ? { background: customValue } : undefined}
            aria-hidden
          />
          <span>Custom</span>
          <input
            type="color"
            className="sr-only"
            value={customValue}
            onChange={(e) => update(e.target.value.toLowerCase())}
            disabled={!hasProfile || pending}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
