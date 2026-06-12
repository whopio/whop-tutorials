import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUsd } from "@/lib/fees";
import BrandIcon from "@/components/BrandIcon";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function DashboardSupportersPage() {
  const { creator } = await requireCreator();

  const [supports, members] = await Promise.all([
    prisma.support.findMany({
      where: { creatorId: creator.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.membership.findMany({
      where: { creatorId: creator.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        tier: { select: { name: true } },
        user: { select: { name: true, username: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Supporters</h1>
        <p className="mt-1 text-sm text-muted">Everyone who has tipped or joined a membership.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">One-time support</h2>
        <div className="kofi-card overflow-hidden">
          {supports.length === 0 ? (
            <p className="p-6 text-sm text-muted">No one-time support yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Coffees</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Message</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {supports.map((support) => (
                    <tr key={support.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium">{support.supporterName}</td>
                      <td className="px-4 py-3 text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <BrandIcon name="coffee" className="h-4 w-4" />
                          {support.coffees}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-positive">
                        {formatUsd(support.amountCents)}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-muted">
                        {support.message ? support.message : <span className="opacity-50">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {formatDate(support.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Active members</h2>
        <div className="kofi-card overflow-hidden">
          {members.length === 0 ? (
            <p className="p-6 text-sm text-muted">No active members yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {member.user.name ?? member.user.username}
                    </p>
                    <p className="text-xs text-muted">{member.tier.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    since {formatDate(member.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
