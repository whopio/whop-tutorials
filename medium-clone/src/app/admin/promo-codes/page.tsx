import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PromoCodesManager } from "./PromoCodesManager";

export const metadata: Metadata = { title: "Promo codes" };

export default async function PromoCodesAdminPage() {
  await requireOperator();
  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { username: true } } },
  });

  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-sans font-bold text-[28px] sm:text-[32px] text-text-primary">
        Promo codes
      </h1>
      <p className="mt-2 text-text-secondary">
        Create discount codes for the Storyline Plus subscription.
      </p>

      <PromoCodesManager
        initial={codes.map((c) => ({
          id: c.id,
          code: c.code,
          discountPercent: c.discountPercent,
          validUntil: c.validUntil?.toISOString() ?? null,
          maxUses: c.maxUses,
          usageCount: c.usageCount,
          createdByUsername: c.createdBy?.username ?? null,
          createdAt: c.createdAt.toISOString(),
          archived: Boolean(c.archivedAt),
        }))}
      />
    </div>
  );
}
