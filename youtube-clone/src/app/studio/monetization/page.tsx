import { requireChannel } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSandbox } from "@/lib/env";
import { getEarnings } from "@/lib/earnings";
import { getChannelMemberCount, getRecentMembers } from "@/lib/membership";
import { MonetizationPanel } from "./monetization-panel";
import { MembershipsPanel } from "./membership-panel";
import { MembersPanel } from "./members-panel";
import { PayoutPortal } from "@/components/payouts/payout-portal";

export const metadata = { title: "Monetization - Wavora Studio" };

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function MonetizationPage() {
  const { channel } = await requireChannel();
  const enrolled = Boolean(channel.whopCompanyId);

  const [tiers, earnings, memberCount, recentMembers] = enrolled
    ? await Promise.all([
        prisma.membershipTier.findMany({
          where: { channelId: channel.id },
          orderBy: { priceCents: "asc" },
          select: { id: true, name: true, description: true, priceCents: true },
        }),
        getEarnings(channel.id),
        getChannelMemberCount(channel.id),
        getRecentMembers(channel.id),
      ])
    : [[], { membershipNetCents: 0, tipNetCents: 0, lifetimeNetCents: 0 }, 0, []];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Monetization</h1>
      <p className="mb-8 max-w-xl text-sm text-fg-muted">
        Get paid by your viewers through Whop - channel memberships and
        Cheers, withdrawn to your own connected account.
      </p>

      <MonetizationPanel
        enrolled={enrolled}
        whopCompanyId={channel.whopCompanyId}
        payoutEnabled={channel.payoutEnabled}
      />

      {enrolled && channel.whopCompanyId ? (
        <div className="mt-8 flex flex-col gap-8">
          <MembershipsPanel tiers={tiers} />

          <div className="max-w-lg rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold">Earnings &amp; payouts</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold">
                  {money(earnings.lifetimeNetCents)}
                </p>
                <p className="text-xs text-fg-muted">Lifetime net</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {money(earnings.membershipNetCents)}
                </p>
                <p className="text-xs text-fg-muted">Memberships</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {money(earnings.tipNetCents)}
                </p>
                <p className="text-xs text-fg-muted">Cheers</p>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-6">
              <PayoutPortal
                companyId={channel.whopCompanyId}
                environment={isSandbox() ? "sandbox" : "production"}
              />
            </div>
          </div>

          <MembersPanel
            memberCount={memberCount}
            recentMembers={recentMembers}
          />
        </div>
      ) : null}
    </div>
  );
}
