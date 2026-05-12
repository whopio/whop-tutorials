"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deletePlaylist } from "@/app/actions/playlists";

interface Playlist {
  id: string;
  name: string;
  songCount: number;
  covers: (string | null)[];
}

export function PlaylistList({ initialPlaylists }: { initialPlaylists: Playlist[] }) {
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(playlistId: string) {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    setDeletingId(playlistId);
    startTransition(async () => {
      const result = await deletePlaylist(playlistId);
      if ("error" in result) setPlaylists(initialPlaylists);
      setDeletingId(null);
    });
  }

  if (playlists.length === 0) {
    return (
      <div
        className="rounded-xl p-10 text-center"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <svg className="w-8 h-8 mx-auto mb-3" fill="none" stroke="rgba(255,255,255,0.1)" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No playlists yet.</p>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
          Visit an artist page and hit <span className="font-mono font-bold">+</span> on any song.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {playlists.map((playlist) => (
        <div
          key={playlist.id}
          className="rounded-xl p-4 flex items-center gap-4 group transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Mosaic cover */}
          <Link href={`/library/${playlist.id}`} className="flex-shrink-0">
            <div
              className="w-14 h-14 rounded-xl overflow-hidden grid grid-cols-2 gap-px"
              style={{ background: "rgba(124,58,237,0.2)" }}
            >
              {Array.from({ length: 4 }).map((_, i) => {
                const cover = playlist.covers[i];
                return cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div key={i} className="w-full h-full flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)" }}>
                    <svg className="w-3 h-3" fill="rgba(124,58,237,0.5)" viewBox="0 0 24 24">
                      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </Link>

          <Link href={`/library/${playlist.id}`} className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{playlist.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {playlist.songCount} song{playlist.songCount !== 1 ? "s" : ""}
            </p>
          </Link>

          <button
            onClick={() => handleDelete(playlist.id)}
            disabled={deletingId === playlist.id}
            title="Delete playlist"
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
