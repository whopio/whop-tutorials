import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/app/components/AppShell";
import { PlaylistList } from "./PlaylistList";

export default async function LibraryPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/api/auth/login");

  const playlists = await prisma.userPlaylist.findMany({
    where: { userId },
    include: {
      songs: {
        include: {
          song: { select: { coverUrl: true, title: true } },
        },
        orderBy: { position: "asc" },
        take: 4,
      },
      _count: { select: { songs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell userId={userId} activeHref="/library">
      <div className="px-8 py-8 max-w-2xl">
        <div className="mb-8">
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            My Library
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
          </p>
        </div>

        <PlaylistList
          initialPlaylists={playlists.map((p) => ({
            id: p.id,
            name: p.name,
            songCount: p._count.songs,
            covers: p.songs.map((s) => s.song.coverUrl),
          }))}
        />
      </div>
    </AppShell>
  );
}
