"use client";

import { useState } from "react";
import Image from "next/image";
import { AudioPlayer } from "./AudioPlayer";
import { UnlockButton } from "./UnlockButton";
import { AddToPlaylistButton } from "./AddToPlaylistButton";

interface Song {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  audioUrl: string;
  previewUrl: string | null;
  duration: number;
  isPremium: boolean;
  price: number;
}

interface SharedPlaylist {
  id: string;
  name: string;
  songIds: string[];
}

interface Props {
  songs: Song[];
  artist: { id: string; displayName: string; whopCompanyId: string | null };
  userId: string | null;
  unlockedSongId: string | null;
  initialPlaylists: SharedPlaylist[];
}

function formatDuration(seconds: number) {
  if (seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SongList({ songs, artist, userId, unlockedSongId, initialPlaylists }: Props) {
  const [sharedPlaylists, setSharedPlaylists] = useState<SharedPlaylist[]>(initialPlaylists);

  function handlePlaylistCreated(playlist: { id: string; name: string }, songId: string) {
    setSharedPlaylists((prev) => [...prev, { id: playlist.id, name: playlist.name, songIds: [songId] }]);
  }

  function handleToggle(playlistId: string, songId: string, added: boolean) {
    setSharedPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId
          ? { ...p, songIds: added ? [...p.songIds, songId] : p.songIds.filter((id) => id !== songId) }
          : p
      )
    );
  }

  if (songs.length === 0) {
    return (
      <div
        className="rounded-xl p-10 text-center"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <svg className="w-8 h-8 mx-auto mb-3" fill="rgba(255,255,255,0.1)" viewBox="0 0 24 24">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No tracks yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {songs.map((song) => {
        const isUnlocked = song.id === unlockedSongId;
        const canPlay = !song.isPremium || isUnlocked;
        const earningsEnabled = !!artist.whopCompanyId;
        const playlistsForSong = sharedPlaylists.map((p) => ({
          id: p.id,
          name: p.name,
          hasSong: p.songIds.includes(song.id),
        }));

        return (
          <div
            key={song.id}
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-start gap-4">
              {/* Cover */}
              <div
                className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #3b1f6e 0%, #7c3aed 100%)" }}
              >
                {song.coverUrl ? (
                  <Image src={song.coverUrl} alt={song.title} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6" fill="rgba(255,255,255,0.5)" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-white leading-tight">{song.title}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {song.isPremium && !isUnlocked && (
                      <span
                        className="text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                        style={{ background: "#7c3aed" }}
                      >
                        ${(song.price / 100).toFixed(2)}
                      </span>
                    )}
                    {isUnlocked && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Unlocked
                      </span>
                    )}
                    <AddToPlaylistButton
                      songId={song.id}
                      userId={userId}
                      playlists={playlistsForSong}
                      onPlaylistCreated={(playlist) => handlePlaylistCreated(playlist, song.id)}
                      onToggle={(playlistId, added) => handleToggle(playlistId, song.id, added)}
                    />
                  </div>
                </div>
                {song.description && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {song.description}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {formatDuration(song.duration)}
                </p>
              </div>
            </div>

            {canPlay ? (
              <AudioPlayer src={song.audioUrl} title={song.title} artist={artist.displayName} />
            ) : song.isPremium && !earningsEnabled ? (
              <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Coming soon
              </div>
            ) : (
              <>
                {song.previewUrl && (
                  <AudioPlayer src={song.previewUrl} title={song.title} artist={artist.displayName} isPreview />
                )}
                <UnlockButton songId={song.id} artistId={artist.id} price={song.price} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
