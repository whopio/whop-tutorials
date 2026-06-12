import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatUsd } from "@/lib/fees";
import CreatorProfileHeader from "@/components/creator/CreatorProfileHeader";

export default async function LeaderboardPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username },
    select: { id: true, displayName: true, isActive: true },
  });
  if (!creator || !creator.isActive) notFound();

  const grouped = await prisma.support.groupBy({
    by: ["supporterName"],
    where: { creatorId: creator.id, status: "COMPLETED", isPublic: true },
    _sum: { amountCents: true, coffees: true },
    orderBy: { _sum: { amountCents: "desc" } },
    take: 25,
  });

  const rows = grouped.map((row) => ({
    name: row.supporterName,
    totalCents: row._sum.amountCents ?? 0,
    coffees: row._sum.coffees ?? 0,
  }));

  return (
    <>
      <CreatorProfileHeader username={username} />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-xl font-bold">Top supporters</h1>
        <p className="mt-1 text-sm text-muted">The biggest supporters of {creator.displayName}.</p>

        <div className="mt-5">
          {rows.length === 0 ? (
            <div className="kofi-card p-8 text-center">
              <p className="text-sm text-muted">No supporters yet. Be the first!</p>
            </div>
          ) : (
            <div className="kofi-card divide-y divide-line overflow-hidden">
              {rows.map((row, i) => (
                <div key={`${row.name}-${i}`} className="flex items-center gap-4 px-5 py-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold"
                    style={i < 3 ? { background: "var(--accent)", color: "#fff" } : undefined}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{row.name}</p>
                    <p className="text-xs text-muted">
                      {row.coffees} {row.coffees === 1 ? "coffee" : "coffees"}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold">{formatUsd(row.totalCents)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
