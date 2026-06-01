import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

/**
 * Monthly Partner Program payout.
 *
 * Triggered by Vercel Cron on the 1st of every month at 00:00 UTC (see vercel.ts).
 * Aggregates Plus-on-Plus reads for the previous month, computes a 70%-of-revenue pool
 * split by reads, and transfers each writer's share to their Whop sub-company.
 *
 * Idempotent: PartnerPayout has unique [writerUserId, monthBucket], and the Whop transfer
 * uses an idempotence key keyed to the same pair — re-running the cron in the same month
 * is a safe no-op.
 *
 * Guarded by CRON_SECRET header (Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`).
 */

function previousMonthBucket(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

interface PayoutRow {
  writerUserId: string;
  reads: number;
  shareCents: number;
}

async function runPartnerPayout(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.endsWith(env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const overrideBucket = url.searchParams.get("monthBucket");
  const monthBucket = overrideBucket || previousMonthBucket();

  // ─── Revenue: count active Plus members × monthly price ───────────────────
  // (Promo-code discounts and refunds aren't tracked yet — v1 keeps it simple.)
  const activeMembers = await prisma.plusMembership.count({
    where: {
      status: { in: ["ACTIVE", "CANCELED"] }, // CANCELED-at-period-end still paid this month
    },
  });
  const monthlyPriceCents = Math.round(Number(env.STORYLINE_PLUS_MONTHLY_PRICE) * 100);
  const grossRevenueCents = activeMembers * monthlyPriceCents;
  const platformPct = Number(env.PLATFORM_PLUS_FEE_PERCENT);
  const poolCents = Math.floor(grossRevenueCents * (100 - platformPct) / 100);

  // ─── Reads aggregated by writer for monthBucket ─────────────────────────
  const readsByWriter = await prisma.storyRead.groupBy({
    by: ["storyId"],
    where: { monthBucket },
    _count: { _all: true },
  });

  if (readsByWriter.length === 0 || poolCents === 0) {
    return NextResponse.json({
      ok: true,
      monthBucket,
      activeMembers,
      grossRevenueCents,
      poolCents,
      writerCount: 0,
      transfers: [],
    });
  }

  // Map storyId → writerId, then sum
  const storyIds = readsByWriter.map((r) => r.storyId);
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds } },
    select: { id: true, authorUserId: true },
  });
  const writerByStory = new Map(stories.map((s) => [s.id, s.authorUserId]));

  const writerReads = new Map<string, number>();
  for (const r of readsByWriter) {
    const writerId = writerByStory.get(r.storyId);
    if (!writerId) continue;
    writerReads.set(writerId, (writerReads.get(writerId) ?? 0) + r._count._all);
  }
  const totalReads = Array.from(writerReads.values()).reduce((a, b) => a + b, 0);
  if (totalReads === 0) {
    return NextResponse.json({
      ok: true,
      monthBucket,
      activeMembers,
      grossRevenueCents,
      poolCents,
      writerCount: 0,
      transfers: [],
    });
  }

  const minPayoutCents = Math.round(Number(env.PARTNER_PAYOUT_MIN_USD) * 100);

  // Build rows; skip writers without KYC or with sub-dollar shares.
  const writers = await prisma.user.findMany({
    where: { id: { in: Array.from(writerReads.keys()) } },
    select: {
      id: true,
      username: true,
      writerProfile: { select: { whopCompanyId: true, kycComplete: true } },
    },
  });

  const rows: (PayoutRow & { whopCompanyId: string })[] = [];
  for (const writer of writers) {
    if (!writer.writerProfile?.kycComplete) continue;
    const reads = writerReads.get(writer.id) ?? 0;
    const shareCents = Math.floor((reads / totalReads) * poolCents);
    if (shareCents < minPayoutCents) continue;
    rows.push({
      writerUserId: writer.id,
      reads,
      shareCents,
      whopCompanyId: writer.writerProfile.whopCompanyId,
    });
  }

  // Skip writers who already have a PartnerPayout for this month — idempotent re-runs.
  const existing = await prisma.partnerPayout.findMany({
    where: {
      monthBucket,
      writerUserId: { in: rows.map((r) => r.writerUserId) },
    },
    select: { writerUserId: true },
  });
  const alreadyPaid = new Set(existing.map((p) => p.writerUserId));
  const eligible = rows.filter((r) => !alreadyPaid.has(r.writerUserId));

  const whop = getCompanyWhop();
  const results: { writerUserId: string; status: "SENT" | "FAILED"; transferId?: string; error?: string }[] = [];

  for (const row of eligible) {
    try {
      const transfer = await whop.transfers.create({
        amount: row.shareCents / 100,
        currency: "usd",
        origin_id: env.WHOP_COMPANY_ID,
        destination_id: row.whopCompanyId,
        idempotence_key: `partner-payout-${row.writerUserId}-${monthBucket}`,
        metadata: {
          kind: "partner_payout",
          monthBucket,
          writerUserId: row.writerUserId,
        },
        notes: `Storyline Partner Program · ${monthBucket}`,
      });

      await prisma.partnerPayout.create({
        data: {
          writerUserId: row.writerUserId,
          monthBucket,
          totalReads: row.reads,
          revenueShareCents: row.shareCents,
          whopTransferId: transfer.id,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      await prisma.notification.create({
        data: {
          userId: row.writerUserId,
          type: "PAYOUT_SENT",
          entityId: transfer.id,
        },
      });
      results.push({ writerUserId: row.writerUserId, status: "SENT", transferId: transfer.id });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Unknown";
      await prisma.partnerPayout.create({
        data: {
          writerUserId: row.writerUserId,
          monthBucket,
          totalReads: row.reads,
          revenueShareCents: row.shareCents,
          status: "FAILED",
          failureReason: reason,
        },
      });
      results.push({ writerUserId: row.writerUserId, status: "FAILED", error: reason });
    }
  }

  return NextResponse.json({
    ok: true,
    monthBucket,
    activeMembers,
    grossRevenueCents,
    poolCents,
    totalReads,
    writerCount: results.length,
    transfers: results,
  });
}

// Vercel Cron sends GET; we also accept POST for manual triggers via curl/dashboard.
export const GET = runPartnerPayout;
export const POST = runPartnerPayout;
