import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, AlertCircle, Coins, Wallet } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutPortal } from "@/components/payouts/PayoutPortal";

export const metadata: Metadata = { title: "Dashboard" };

interface PageProps {
  searchParams: Promise<{ kyc?: string }>;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonth(bucket: string): string {
  if (bucket.endsWith("-sandbox")) return "Sandbox credit";
  const [yyyy, mm] = bucket.split("-");
  const d = new Date(Number(yyyy), Number(mm) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function currentMonthBucket(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function WriterDashboardPage({ searchParams }: PageProps) {
  const user = await requireAuth({ include: { writerProfile: true } });
  const { kyc } = await searchParams;
  const monthBucket = currentMonthBucket();

  const [totals, recentTips, partnerPayouts, mtdReads] = await Promise.all([
    prisma.story.aggregate({
      where: { authorUserId: user.id, status: "PUBLISHED" },
      _sum: { likesTotal: true },
      _count: { _all: true },
    }),
    prisma.tip.findMany({
      where: { writerUserId: user.id, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        story: { select: { title: true, slug: true } },
        tipper: { select: { username: true, name: true } },
      },
    }),
    prisma.partnerPayout.findMany({
      where: { writerUserId: user.id },
      orderBy: { monthBucket: "desc" },
      take: 6,
    }),
    prisma.storyRead.count({
      where: { story: { authorUserId: user.id }, monthBucket },
    }),
  ]);

  const lifetimeTipNetCents = recentTips.reduce(
    (sum, t) => sum + (t.amountCents - t.applicationFeeCents),
    0,
  );
  const lifetimePartnerCents = partnerPayouts
    .filter((p) => p.status === "SENT")
    .reduce((sum, p) => sum + p.revenueShareCents, 0);

  const totalLikes = totals._sum.likesTotal ?? 0;
  const totalStories = totals._count._all;

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="font-sans font-bold text-[28px] sm:text-[32px] text-text-primary">
          Writer dashboard
        </h1>
        <Link
          href="/me/stories"
          className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
        >
          Your stories <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </header>

      {kyc === "complete" && (
        <div
          role="status"
          className="mb-6 px-4 py-3 rounded-md bg-brand/10 text-brand text-sm border border-brand/30"
        >
          Payouts are live. Tips and Partner Program transfers will land in your Whop wallet.
        </div>
      )}

      {!user.writerProfile?.kycComplete && (
        <div
          role="alert"
          className="mb-8 p-5 rounded-md border border-warning/40 bg-warning/10 flex items-start gap-3"
        >
          <AlertCircle aria-hidden="true" className="size-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-text-primary">Turn on payouts to start earning</p>
            <p className="text-sm text-text-secondary mt-1">
              Two-minute setup. Tips clear instantly; Partner Program payouts arrive on the 1st
              of each month.
            </p>
            <Link
              href="/me/settings"
              className="mt-3 inline-flex items-center px-3 py-1.5 rounded-pill bg-warning text-white text-sm font-medium hover:bg-warning/90"
            >
              Go to settings
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <StatCard label="Likes received" value={totalLikes} />
        <StatCard label="Stories published" value={totalStories} />
        <StatCard label="Plus reads (this month)" value={mtdReads} />
        <StatCard
          label="Lifetime earnings"
          value={formatCents(lifetimeTipNetCents + lifetimePartnerCents)}
        />
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
          Partner Program payouts
        </h2>
        {partnerPayouts.length === 0 ? (
          <p className="text-text-secondary text-sm">
            No payouts yet. The Partner Program clears on the 1st of each month — this month&apos;s
            paid-story reads roll into the next payout.
          </p>
        ) : (
          <ul className="border-t border-border">
            {partnerPayouts.map((p) => (
              <li
                key={p.id}
                className="py-3 flex items-center justify-between gap-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Wallet aria-hidden="true" className="size-4 text-text-secondary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary">{formatMonth(p.monthBucket)}</div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {p.totalReads} {p.totalReads === 1 ? "read" : "reads"}
                      {p.status === "FAILED" && p.failureReason && ` · failed: ${p.failureReason}`}
                      {p.status === "PENDING" && " · pending"}
                    </div>
                  </div>
                </div>
                <div
                  className={
                    "text-sm font-medium tabular-nums " +
                    (p.status === "FAILED" ? "text-error" : "text-text-primary")
                  }
                >
                  {p.status === "SENT" ? "+" : ""}
                  {formatCents(p.revenueShareCents)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
          Recent tips
        </h2>
        {recentTips.length === 0 ? (
          <p className="text-text-secondary text-sm">No tips received yet.</p>
        ) : (
          <ul className="border-t border-border">
            {recentTips.map((t) => (
              <li
                key={t.id}
                className="py-3 flex items-center justify-between gap-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Coins aria-hidden="true" className="size-4 text-brand shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      {t.tipper.name ?? `@${t.tipper.username}`} tipped{" "}
                      <Link
                        href={`/@${user.username}/${t.story.slug}`}
                        className="font-medium hover:underline"
                      >
                        {t.story.title}
                      </Link>
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {formatDate(t.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium text-text-primary tabular-nums">
                  +{formatCents(t.amountCents - t.applicationFeeCents)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {user.writerProfile?.kycComplete && user.writerProfile.whopCompanyId && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
            Withdraw
          </h2>
          <PayoutPortal
            companyId={user.writerProfile.whopCompanyId}
            kycComplete={user.writerProfile.kycComplete}
          />
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="text-xs text-text-secondary uppercase tracking-wider">{label}</div>
      <div className="mt-1 font-sans font-bold text-[22px] text-text-primary tabular-nums">
        {value}
      </div>
    </div>
  );
}
