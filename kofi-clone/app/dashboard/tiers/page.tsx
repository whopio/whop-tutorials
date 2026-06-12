import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TierManager from "@/components/dashboard/TierManager";

export default async function DashboardTiersPage() {
  const { creator } = await requireCreator();

  const tiers = await prisma.tier.findMany({
    where: { creatorId: creator.id },
    orderBy: [{ order: "asc" }, { priceCents: "asc" }],
    include: {
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
  });

  const initialTiers = tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    description: tier.description,
    priceCents: tier.priceCents,
    benefits: tier.benefits,
    memberCount: tier._count.memberships,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Membership tiers</h1>
        <p className="mt-1 text-sm text-muted">
          Offer monthly memberships with their own benefits and supporter-only access.
        </p>
      </div>

      <TierManager tiers={initialTiers} />
    </div>
  );
}
