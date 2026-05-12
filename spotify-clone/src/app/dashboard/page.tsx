import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/app/components/AppShell";
import { ProfileForm } from "./ProfileForm";
import { SongForm } from "./SongForm";
import { SongRow } from "./SongRow";
import { EarningsButton } from "./EarningsButton";
import { PayoutPortal } from "./PayoutPortal";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creator: {
        include: { songs: { orderBy: { createdAt: "desc" } } },
      },
    },
  });

  const artist = user?.creator ?? null;

  return (
    <AppShell userId={userId} artistHandle={artist?.handle} activeHref="/dashboard">
      <div className="px-8 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Manage your artist profile, songs, and earnings.
            </p>
          </div>
          {artist && (
            <Link
              href={`/a/${artist.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
            >
              View artist page
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {/* Setup banner */}
          {!artist && (
            <div
              className="rounded-xl p-5 flex items-start gap-3"
              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="#a78bfa" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-sm text-white">Set up your profile</p>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Create your artist profile to start uploading songs and earning.
                </p>
              </div>
            </div>
          )}

          {/* Profile */}
          <DarkCard title="Profile">
            <ProfileForm artist={artist} />
          </DarkCard>

          {/* Songs */}
          {artist && (
            <DarkCard
              title="Songs"
              badge={`${artist.songs.length} track${artist.songs.length !== 1 ? "s" : ""}`}
            >
              {artist.songs.length > 0 && (
                <div
                  className="divide-y mb-4"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  {artist.songs.map((song) => (
                    <SongRow key={song.id} song={song} />
                  ))}
                </div>
              )}
              <div
                className="pt-4"
                style={{ borderTop: artist.songs.length > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Upload new track
                </p>
                <SongForm />
              </div>
            </DarkCard>
          )}

          {/* Earnings */}
          {artist && (
            <DarkCard title="Earnings">
              <EarningsButton enrolled={!!artist.whopCompanyId} payoutEnabled={artist.payoutEnabled} />
            </DarkCard>
          )}

          {/* Payout Portal */}
          {artist?.payoutEnabled && (
            <DarkCard title="Payout Portal">
              <PayoutPortal companyId={artist.whopCompanyId!} />
            </DarkCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function DarkCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2 className="font-semibold text-sm text-white" style={{ fontFamily: "var(--font-bricolage)" }}>
          {title}
        </h2>
        {badge && (
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            {badge}
          </span>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}
