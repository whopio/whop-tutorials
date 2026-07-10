import "server-only";
import { prisma } from "./prisma";

/**
 * PAYOUTS-9: lifetime creator earnings from our ledger, split by source
 * (memberships vs Cheers). Net is after our application fee; refunds are
 * negative ledger entries so they reduce the totals.
 */
export async function getEarnings(channelId: string) {
  const rows = await prisma.earningsLedger.groupBy({
    by: ["source"],
    where: { channelId },
    _sum: { netCents: true },
  });

  let membershipNetCents = 0;
  let tipNetCents = 0;
  for (const r of rows) {
    if (r.source === "MEMBERSHIP") membershipNetCents = r._sum.netCents ?? 0;
    else if (r.source === "SUPER_THANKS") tipNetCents = r._sum.netCents ?? 0;
  }

  return {
    membershipNetCents,
    tipNetCents,
    lifetimeNetCents: membershipNetCents + tipNetCents,
  };
}
