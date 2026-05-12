import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const revalidate = 60;

export default async function Home() {
  const [session, trendingSongs, newReleases, artists] = await Promise.all([
    getSession(),
    prisma.song.findMany({
      take: 6,
      orderBy: { plays: "desc" },
      include: { artist: { select: { displayName: true, handle: true } } },
    }),
    prisma.song.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { artist: { select: { displayName: true, handle: true } } },
    }),
    prisma.artist.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { songs: true } } },
    }),
  ]);

  const userId = session.userId ?? null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#121212", color: "#fff" }}>

      {/* ── Left Sidebar ── */}
      <aside
        className="flex-shrink-0 flex flex-col h-full py-6 px-3"
        style={{ width: 220, background: "#000" }}
      >
        <Link
          href="/"
          className="px-3 mb-7 text-xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage)", color: "#fff" }}
        >
          soundify
        </Link>

        <nav className="flex flex-col gap-1">
          <SidebarLink href="/" icon={<IconHome />} label="Home" active />
          {userId && <SidebarLink href="/library" icon={<IconLibrary />} label="Your Library" />}
          {userId && <SidebarLink href="/dashboard" icon={<IconDashboard />} label="Dashboard" />}
        </nav>

        <div className="flex-1" />

        {!userId && (
          <div className="px-3 flex flex-col gap-3">
            <a
              href="/api/auth/login"
              className="text-center text-sm font-semibold py-3 rounded-full"
              style={{ background: "#7c3aed", color: "#fff" }}
            >
              Sign up free
            </a>
            <a
              href="/api/auth/login"
              className="text-center text-sm font-semibold py-3 rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              Log in
            </a>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto px-8 py-6">

        {trendingSongs.length > 0 && (
          <Section title="Trending Songs">
            <CardGrid>
              {trendingSongs.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </CardGrid>
          </Section>
        )}

        {artists.length > 0 && (
          <Section title="Popular Artists">
            <CardGrid>
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </CardGrid>
          </Section>
        )}

        {newReleases.length > 0 && (
          <Section title="New Releases">
            <CardGrid>
              {newReleases.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </CardGrid>
          </Section>
        )}

        {trendingSongs.length === 0 && artists.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: "rgba(124,58,237,0.15)" }}
            >
              <svg className="w-9 h-9" fill="none" stroke="#7c3aed" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-bricolage)" }}>
              No music yet
            </h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
              Be the first artist to share your music on Soundify.
            </p>
            <a
              href="/api/auth/login"
              className="text-sm font-semibold px-6 py-2.5 rounded-full"
              style={{ background: "#7c3aed", color: "#fff" }}
            >
              Start sharing music
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Sidebar link ── */
function SidebarLink({
  href, icon, label, active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors"
      style={{
        color: active ? "#fff" : "rgba(255,255,255,0.5)",
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

/* ── Section wrapper ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-bricolage)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

/* ── Responsive grid that fills the available width ── */
function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: "12px",
      }}
    >
      {children}
    </div>
  );
}

/* ── Song card ── */
type SongWithArtist = {
  id: string;
  title: string;
  coverUrl: string | null;
  isPremium: boolean;
  price: number;
  plays: number;
  artist: { displayName: string; handle: string };
};

function SongCard({ song }: { song: SongWithArtist }) {
  return (
    <Link
      href={`/a/${song.artist.handle}`}
      className="group rounded-lg p-3 transition-colors"
      style={{ background: "rgba(255,255,255,0.04)", minWidth: 0 }}
    >
      <div
        className="relative w-full rounded-md overflow-hidden mb-3"
        style={{ aspectRatio: "1", background: "linear-gradient(135deg, #3b1f6e 0%, #7c3aed 100%)" }}
      >
        {song.coverUrl ? (
          <Image
            src={song.coverUrl}
            alt={song.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 1200px) 16vw, 160px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        <div
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 shadow-lg"
          style={{ background: "#7c3aed" }}
        >
          <svg className="w-4 h-4 ml-0.5" fill="#fff" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <p className="font-semibold text-xs truncate" style={{ color: "#fff" }}>
        {song.title}
      </p>
      <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {song.artist.displayName}
      </p>
      <p className="text-xs mt-1 font-medium" style={{ color: song.isPremium ? "#a78bfa" : "rgba(255,255,255,0.3)" }}>
        {song.isPremium ? `$${(song.price / 100).toFixed(2)}` : "Free"}
      </p>
    </Link>
  );
}

/* ── Artist card ── */
type ArtistWithCount = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  _count: { songs: number };
};

function ArtistCard({ artist }: { artist: ArtistWithCount }) {
  return (
    <Link
      href={`/a/${artist.handle}`}
      className="group rounded-lg p-3 text-center transition-colors"
      style={{ background: "rgba(255,255,255,0.04)", minWidth: 0 }}
    >
      <div
        className="relative rounded-full overflow-hidden mb-3 mx-auto"
        style={{
          width: "80%",
          aspectRatio: "1",
          background: "linear-gradient(135deg, #3b1f6e 0%, #7c3aed 100%)",
        }}
      >
        {artist.avatarUrl ? (
          <Image
            src={artist.avatarUrl}
            alt={artist.displayName}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 1200px) 13vw, 130px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="text-2xl font-extrabold text-white uppercase"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              {artist.displayName[0]}
            </span>
          </div>
        )}
      </div>
      <p className="font-semibold text-xs truncate" style={{ color: "#fff" }}>
        {artist.displayName}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        Artist
      </p>
    </Link>
  );
}

/* ── Icons ── */
function IconHome() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3L2 12h3v9h6v-5h2v5h6v-9h3L12 3z" />
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}
