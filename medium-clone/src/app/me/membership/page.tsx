import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { MembershipActions } from "./MembershipActions";

export const metadata: Metadata = { title: "Membership" };

function formatLongDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const PRICE = Number(process.env.STORYLINE_PLUS_MONTHLY_PRICE || "5");

export default async function MyMembershipPage() {
  const user = await requireAuth({ include: { plusMembership: true } });
  const membership = user.plusMembership;

  if (!membership || membership.status === "EXPIRED") {
    return (
      <div className="mx-auto max-w-[600px] px-4 sm:px-6 py-12">
        <h1 className="font-sans font-bold text-[28px] text-text-primary">Subscription</h1>
        <p className="mt-3 text-text-secondary">
          You&apos;re not subscribed yet. ${PRICE}/month unlocks every paid story, and 70% goes to
          the writers you read.
        </p>
        <Link
          href="/membership"
          className="mt-6 inline-flex items-center px-5 py-2.5 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover"
        >
          Subscribe — ${PRICE}/month
        </Link>
      </div>
    );
  }

  const statusLabel =
    membership.status === "ACTIVE"
      ? membership.cancelAtPeriodEnd
        ? `Active — ends ${formatLongDate(membership.currentPeriodEnd)}`
        : `Active — renews ${formatLongDate(membership.currentPeriodEnd)}`
      : membership.status === "PAUSED"
        ? "Paused"
        : "Canceled";

  return (
    <div className="mx-auto max-w-[600px] px-4 sm:px-6 py-12">
      <h1 className="font-sans font-bold text-[28px] text-text-primary">Subscription</h1>

      <section className="mt-6 rounded-md border border-border p-6 bg-background">
        <div className="flex items-center gap-2">
          <Star aria-hidden="true" className="size-5 fill-plus stroke-plus" />
          <span className="font-sans font-semibold text-text-primary">Storyline Plus</span>
        </div>
        <p className="mt-3 text-text-primary">{statusLabel}</p>
        <p className="mt-1 text-sm text-text-secondary">${PRICE}/month · billed by Whop on your behalf</p>

        <div className="mt-6">
          <MembershipActions
            status={membership.status}
            cancelAtPeriodEnd={membership.cancelAtPeriodEnd}
          />
        </div>
      </section>
    </div>
  );
}
