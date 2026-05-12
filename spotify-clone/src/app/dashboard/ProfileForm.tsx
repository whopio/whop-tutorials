"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/actions/artist";
import type { Artist } from "@prisma/client";

const initialState: ProfileFormState = {};

const inputClass = "w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-shadow";
const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
};

export function ProfileForm({ artist }: { artist: Artist | null }) {
  const [state, action, pending] = useActionState(saveProfile, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Handle */}
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Handle</label>
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span
              className="flex items-center px-3 text-sm font-mono select-none border-r"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              /a/
            </span>
            <input
              name="handle"
              type="text"
              defaultValue={artist?.handle ?? ""}
              placeholder="your-handle"
              className="flex-1 px-3 py-2.5 text-sm outline-none"
              style={{ background: "transparent", color: "#fff" }}
            />
          </div>
          {state.errors?.handle && (
            <p className="text-xs text-red-400 mt-1.5">{state.errors.handle[0]}</p>
          )}
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Display Name</label>
          <input
            name="displayName"
            type="text"
            defaultValue={artist?.displayName ?? ""}
            placeholder="Your Name"
            className={inputClass}
            style={inputStyle}
          />
          {state.errors?.displayName && (
            <p className="text-xs text-red-400 mt-1.5">{state.errors.displayName[0]}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-white mb-1.5">
          Bio <span className="font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span>
        </label>
        <textarea
          name="bio"
          defaultValue={artist?.bio ?? ""}
          placeholder="Tell listeners about yourself..."
          rows={3}
          className={inputClass + " resize-none"}
          style={inputStyle}
        />
        {state.errors?.bio && (
          <p className="text-xs text-red-400 mt-1.5">{state.errors.bio[0]}</p>
        )}
      </div>

      {state.message && <p className="text-sm text-red-400">{state.message}</p>}
      {state.success && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Profile saved successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all disabled:opacity-50"
        style={{ background: "#7c3aed" }}
      >
        {pending ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
