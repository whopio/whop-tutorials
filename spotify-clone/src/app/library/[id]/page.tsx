import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/app/components/AppShell";
import { AudioPlayer } from "@/app/a/[handle]/AudioPlayer";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDuration(seconds: number) {
  if (seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function PlaylistPage({ params }: PageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/api/auth/login");

  const playlist = await prisma.userPlaylist.findUnique({
    where: { id },
    include: {
      songs: {
        include: {
          song: {
            include: { artist: { select: { handle: true, displayName: true } } },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!playlist || playlist.userId !== userId) notFound();

  return (
    <AppShell userId={userId} activeHref="/library">
      <div className="px-8 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </Link>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            {playlist.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            {playlist.songs.length} song{playlist.songs.length !== 1 ? "s" : ""}
          </p>
        </div>

        {playlist.songs.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <svg className="w-8 h-8 mx-auto mb-3" fill="rgba(255,255,255,0.1)" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No songs in this playlist yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlist.songs.map(({ song }) => {
              const canPlay = !song.isPremium;
              return (
                <div
                  key={song.id}
                  className="rounded-xl p-5"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: "rgba(124,58,237,0.3)" }}
                    >
                      {song.coverUrl ? (
                        <Image src={song.coverUrl} alt={song.title} width={56} height={56} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6" fill="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
                          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-white leading-tight truncate">{song.title}</p>
                          <Link
                            href={`/a/${song.artist.handle}`}
                            className="text-xs mt-0.5 inline-block transition-colors hover:text-white"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {song.artist.displayName}
                          </Link>
                        </div>
                        {song.isPremium && (
                          <span
                            className="flex-shrink-0 text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                            style={{ background: "#7c3aed" }}
                          >
                            ${(song.price / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {formatDuration(song.duration)}
                      </p>
                    </div>
                  </div>

                  {canPlay ? (
                    <AudioPlayer src={song.audioUrl} title={song.title} artist={song.artist.displayName} />
                  ) : (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Premium track
                      </div>
                      <Link
                        href={`/a/${song.artist.handle}`}
                        className="text-xs font-semibold flex items-center gap-1 hover:underline"
                        style={{ color: "#a78bfa" }}
                      >
                        Unlock on artist page
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
