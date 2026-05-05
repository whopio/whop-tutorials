"use client";

import { useActionState, useState, useTransition } from "react";
import { saveProfile, setAccent } from "@/app/actions/creator";
import { ACCENTS, type AccentKey } from "@/lib/theme";
import type { Creator } from "@prisma/client";

const inputClass =
  "w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-white placeholder:text-neutral-300";

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5";

export function ProfileForm({
  creator,
  intendedHandle,
}: {
  creator: Creator | null;
  intendedHandle?: string;
}) {
  const [state, action, pending] = useActionState(saveProfile, {});
  const handleDefault = creator?.handle ?? intendedHandle ?? "";

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelClass}>Handle</label>
        <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-colors">
          <span className="px-3 py-2.5 text-sm text-neutral-400 bg-neutral-50 border-r border-neutral-200 select-none">
            /u/
          </span>
          <input
            name="handle"
            defaultValue={handleDefault}
            placeholder="yourname"
            className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Display name</label>
        <input
          name="title"
          defaultValue={creator?.title ?? ""}
          placeholder="Your name"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Bio</label>
        <textarea
          name="bio"
          defaultValue={creator?.bio ?? ""}
          placeholder="A short bio"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label className={labelClass}>Premium unlock price (USD)</label>
        <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-colors">
          <span className="px-3 py-2.5 text-sm text-neutral-400 bg-neutral-50 border-r border-neutral-200 select-none">
            $
          </span>
          <input
            name="unlockPrice"
            type="number"
            min="1"
            max="1000"
            step="1"
            defaultValue={creator ? (creator.unlockPrice / 100).toString() : "5"}
            className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
            required
          />
        </div>
        <p className="text-xs text-neutral-400 mt-1.5">Minimum $1.</p>
      </div>

      {state.error && (
        <p className="text-sm text-red-700 border border-red-100 bg-red-50 rounded-lg px-3 py-2.5">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 border border-green-100 bg-green-50 rounded-lg px-3 py-2.5">
          Profile saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

export function AccentPicker({
  current,
  hasProfile,
}: {
  current: AccentKey;
  hasProfile: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<AccentKey>(current);
  const [error, setError] = useState<string | null>(null);

  const update = (next: AccentKey) => {
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
  };

  return (
    <div>
      <p className={labelClass}>Accent color</p>
      <div className="flex items-center gap-2.5">
        {ACCENTS.map((accent) => {
          const active = optimistic === accent.key;
          return (
            <button
              key={accent.key}
              type="button"
              onClick={() => update(accent.key)}
              disabled={pending || !hasProfile}
              aria-label={accent.label}
              aria-pressed={active}
              className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: accent.hex }}
            >
              {active && (
                <span className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-neutral-900" />
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
