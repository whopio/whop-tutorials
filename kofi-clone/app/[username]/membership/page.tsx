import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isSandbox } from "@/lib/env";
import CreatorProfileHeader from "@/components/creator/CreatorProfileHeader";
import MembershipTiers from "@/components/creator/MembershipTiers";

export default async function MembershipPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username },
    select: {
      id: true,
      displayName: true,
      accentColor: true,
      isActive: true,
      tiers: {
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
        select: { id: true, name: true, description: true, priceCents: true, benefits: true },
      },
    },
  });
  if (!creator || !creator.isActive) notFound();

  const [user, memberCounts] = await Promise.all([
    getCurrentUser(),
    Promise.all(
      creator.tiers.map((tier) =>
        prisma.membership.count({
          where: { tierId: tier.id, status: { in: ["ACTIVE", "CANCELING"] } },
        }),
      ),
    ),
  ]);

  const tiers = creator.tiers.map((tier, i) => ({ ...tier, memberCount: memberCounts[i] }));

  return (
    <>
      <CreatorProfileHeader username={username} />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-xl font-bold">Become a regular</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a monthly membership to back {creator.displayName} and get member-only perks.
        </p>

        <div className="mt-5">
          {tiers.length === 0 ? (
            <div className="kofi-card p-8 text-center">
              <p className="text-sm text-muted">{creator.displayName} hasn&apos;t set up any membership tiers yet.</p>
            </div>
          ) : (
            <MembershipTiers
              tiers={tiers}
              creatorUsername={username}
              creatorDisplayName={creator.displayName}
              accentColor={creator.accentColor}
              sandbox={isSandbox()}
              isLoggedIn={Boolean(user)}
            />
          )}
        </div>
      </div>
    </>
  );
}
