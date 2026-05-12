import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";
import { getSession } from "@/lib/session";
import { AppShell } from "@/app/components/AppShell";
import { SongList } from "./SongList";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    checkout_status?: string;
    payment_id?: string;
    unlocked?: string;
    song?: string;
  }>;
}

export default async function ArtistPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const { checkout_status, payment_id, unlocked, song: songParam } = await searchParams;

  const [artist, session] = await Promise.all([
    prisma.artist.findUnique({
      where: { handle },
      include: { songs: { orderBy: { createdAt: "desc" } } },
    }),
    getSession(),
  ]);

  if (!artist) notFound();

  const userId = session.userId ?? null;

  if (checkout_status === "success" && payment_id && unlocked) {
    try {
      const payment = await whop.payments.retrieve(payment_id);
      if (payment.status === "paid") {
        await prisma.unlock.updateMany({
          where: { id: unlocked, status: "PENDING" },
          data: { status: "PAID", whopPaymentId: payment_id },
        });
      }
    } catch {
      // Non-fatal
    }
  }

  let unlockedSongId: string | null = null;
  if (unlocked && songParam) {
    const unlock = await prisma.unlock.findUnique({ where: { id: unlocked } });
    if (unlock && unlock.artistId === artist.id && unlock.songId === songParam && unlock.status === "PAID") {
      unlockedSongId = unlock.songId;
    }
  }

  const userPlaylists = userId
    ? await prisma.userPlaylist.findMany({
        where: { userId },
        include: { songs: { select: { songId: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <AppShell userId={userId}>
      <div className="px-8 py-8 max-w-2xl">
        {/* Artist header */}
        <div
          className="rounded-2xl p-8 mb-6 flex items-start gap-6"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={
              !artist.avatarUrl
                ? { background: "linear-gradient(135deg, #3b1f6e 0%, #7c3aed 100%)" }
                : {}
            }
          >
            {artist.avatarUrl ? (
              <Image
                src={artist.avatarUrl}
                alt={artist.displayName}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-4xl font-bold text-white uppercase"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                {artist.displayName[0]}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              {artist.displayName}
            </h1>
            <p className="font-mono text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              @{artist.handle}
            </p>
            {artist.bio && (
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {artist.bio}
              </p>
            )}
            <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
              {artist.songs.length} track{artist.songs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Song list */}
        <SongList
          songs={artist.songs.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            coverUrl: s.coverUrl,
            audioUrl: s.audioUrl,
            previewUrl: s.previewUrl,
            duration: s.duration,
            isPremium: s.isPremium,
            price: s.price,
          }))}
          artist={{
            id: artist.id,
            displayName: artist.displayName,
            whopCompanyId: artist.whopCompanyId,
          }}
          userId={userId}
          unlockedSongId={unlockedSongId}
          initialPlaylists={userPlaylists.map((p) => ({
            id: p.id,
            name: p.name,
            songIds: p.songs.map((s) => s.songId),
          }))}
        />
      </div>
    </AppShell>
  );
}
