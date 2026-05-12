"use client";

import { useState, useTransition, useRef, useEffect, KeyboardEvent } from "react";
import {
  addSongToPlaylist,
  removeSongFromPlaylist,
  createPlaylist,
} from "@/app/actions/playlists";

interface Playlist {
  id: string;
  name: string;
  hasSong: boolean;
}

interface Props {
  songId: string;
  userId: string | null;
  playlists: Playlist[];
  onPlaylistCreated: (playlist: { id: string; name: string }) => void;
  onToggle: (playlistId: string, added: boolean) => void;
}

export function AddToPlaylistButton({ songId, userId, playlists, onPlaylistCreated, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function toggle(playlist: Playlist) {
    onToggle(playlist.id, !playlist.hasSong);
    startTransition(async () => {
      if (playlist.hasSong) {
        await removeSongFromPlaylist(playlist.id, songId);
      } else {
        await addSongToPlaylist(playlist.id, songId);
      }
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const name = newName.trim();
    setNewName("");
    setCreating(false);

    startTransition(async () => {
      const result = await createPlaylist(name, songId);
      if ("playlist" in result && result.playlist) {
        onPlaylistCreated(result.playlist);
      }
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") {
      setCreating(false);
      setNewName("");
    }
  }

  if (!userId) {
    return (
      <a
        href="/api/auth/login"
        title="Sign in to save songs"
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </a>
    );
  }

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (open) { setCreating(false); setNewName(""); }
        }}
        title="Add to playlist"
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          open
            ? "bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30"
            : "bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white hover:shadow-md hover:shadow-[#7c3aed]/30"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl border border-black/10 shadow-xl z-30 w-56">
          <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Save to playlist
          </p>

          {playlists.length === 0 && !creating && (
            <p className="px-3 py-2 text-xs text-gray-400">No playlists yet</p>
          )}

          <div className="max-h-44 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => toggle(playlist)}
                disabled={isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-black/[0.03] text-left transition-colors disabled:opacity-50"
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                    playlist.hasSong ? "bg-[#7c3aed] border-[#7c3aed]" : "border-black/20"
                  }`}
                >
                  {playlist.hasSong && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="text-sm truncate text-gray-800">{playlist.name}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-black/[0.06]">
            {creating ? (
              <div className="px-3 py-2.5 flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Playlist name…"
                  maxLength={100}
                  className="flex-1 min-w-0 text-sm outline-none placeholder-gray-300 text-gray-900"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || isPending}
                  className="flex-shrink-0 text-xs font-semibold text-white bg-[#7c3aed] px-2.5 py-1 rounded-full disabled:opacity-40 whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-black/[0.03] transition-colors text-sm text-[#7c3aed] font-medium rounded-b-xl"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                New playlist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
