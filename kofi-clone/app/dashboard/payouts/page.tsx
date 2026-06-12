import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSandbox } from "@/lib/env";
import { reconcilePendingSupports } from "@/lib/fulfillment";
import { getPayoutSnapshot, type PayoutSnapshot } from "@/services/whop";
import PayoutsPortal from "@/components/payouts/PayoutsPortal";

export default async function PayoutsPage() {
  const { creator } = await requireCreator();

  // Heal any tips that settled but missed their webhook/confirm before tallying.
  if (creator.whopCompanyId) {
    await reconcilePendingSupports(creator.id, creator.whopCompanyId);
  }

  const earned = await prisma.support.aggregate({
    where: { creatorId: creator.id, status: "COMPLETED" },
    _sum: { amountCents: true },
  });
  const earnedCents = earned._sum.amountCents ?? 0;

  // Read the connected account's real KYC/payout status + balance (best-effort).
  let snapshot: PayoutSnapshot = { activated: false, status: null, availableCents: 0, pendingCents: 0 };
  if (creator.whopCompanyId) {
    try {
      snapshot = await getPayoutSnapshot(creator.whopCompanyId);
    } catch (err: unknown) {
      console.error("getPayoutSnapshot failed:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Your earnings come straight from the supporters who tip you, join your
          memberships, and buy from your shop. Withdraw your available balance to
          your bank account or PayPal whenever you like.
        </p>
      </div>

      {!creator.whopCompanyId ? (
        <div className="kofi-card p-6">
          <h2 className="text-lg font-bold">Finish setting up payments</h2>
          <p className="mt-1 text-sm text-muted">
            We need to connect your payout account before you can withdraw. Complete
            your creator setup to start receiving and withdrawing support.
          </p>
          <Link href="/dashboard/start" className="btn-pill btn-accent mt-4">
            Finish setup
          </Link>
        </div>
      ) : (
        <>
          <PayoutsPortal
            companyId={creator.whopCompanyId}
            accentColor={creator.accentColor}
            sandbox={isSandbox()}
            earnedCents={earnedCents}
            activated={snapshot.activated}
            availableCents={snapshot.availableCents}
            pendingCents={snapshot.pendingCents}
          />
          <p className="text-xs text-muted">
            Identity verification (KYC) is handled securely inside the portal the first
            time you withdraw. You only need to do it once.
          </p>
        </>
      )}
    </div>
  );
}
