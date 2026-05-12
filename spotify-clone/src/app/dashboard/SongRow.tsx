"use client";

import { useActionState } from "react";
import Image from "next/image";
import { togglePremium, deleteSong, type SongFormState } from "@/app/actions/songs";
import type { Song } from "@prisma/client";

const initialState: SongFormState = {};

function formatDuration(seconds: number) {
  if (seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SongRow({ song }: { song: Song }) {
  const [, toggleAction, togglePending] = useActionState(togglePremium, initialState);
  const [, deleteAction, deletePending] = useActionState(deleteSong, initialState);

  return (
    <div
      className="flex items-center gap-4 py-3 transition-colors"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Cover */}
      <div
        className="w-10 h-10 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: "rgba(124,58,237,0.3)" }}
      >
        {song.coverUrl ? (
          <Image src={song.coverUrl} alt={song.title} width={40} height={40} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-4 h-4" fill="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{song.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {formatDuration(song.duration)}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={
              song.isPremium
                ? { background: "#7c3aed", color: "#fff" }
                : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
            }
          >
            {song.isPremium ? `$${(song.price / 100).toFixed(2)}` : "Free"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <form action={toggleAction}>
          <input type="hidden" name="songId" value={song.id} />
          <button
            type="submit"
            disabled={togglePending}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
            style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
          >
            {togglePending ? "…" : song.isPremium ? "Set Free" : "Set Premium"}
          </button>
        </form>

        <form action={deleteAction}>
          <input type="hidden" name="songId" value={song.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
            style={{ color: "#f87171" }}
          >
            {deletePending ? "…" : "Delete"}
          </button>
        </form>
      </div>
    </div>
  );
}
