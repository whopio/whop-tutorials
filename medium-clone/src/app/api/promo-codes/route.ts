import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

const CreateSchema = z.object({
  code: z.string().trim().min(2).max(64),
  discountPercent: z.number().int().min(1).max(100),
  validUntil: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  await requireOperator();
  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { username: true } } },
  });
  return NextResponse.json({
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      discountPercent: c.discountPercent,
      validUntil: c.validUntil?.toISOString() ?? null,
      maxUses: c.maxUses,
      usageCount: c.usageCount,
      createdByUsername: c.createdBy?.username ?? null,
      createdAt: c.createdAt.toISOString(),
      archived: Boolean(c.archivedAt),
    })),
  });
}

export async function POST(req: NextRequest) {
  const me = await requireOperator();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const code = parsed.data.code.toUpperCase();

  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 });
  }

  try {
    const whopPromo = await getCompanyWhop().promoCodes.create({
      company_id: env.WHOP_COMPANY_ID,
      code,
      promo_type: "percentage",
      amount_off: parsed.data.discountPercent,
      base_currency: "usd",
      plan_ids: [env.STORYLINE_PLUS_PLAN_ID],
      promo_duration_months: 1,
      new_users_only: false,
      ...(parsed.data.validUntil ? { expires_at: parsed.data.validUntil } : {}),
      ...(parsed.data.maxUses
        ? { stock: parsed.data.maxUses, unlimited_stock: false }
        : { unlimited_stock: true }),
    });

    const row = await prisma.promoCode.create({
      data: {
        code,
        whopPromoCodeId: whopPromo.id,
        discountPercent: parsed.data.discountPercent,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        maxUses: parsed.data.maxUses ?? null,
        createdByUserId: me.id,
      },
    });
    return NextResponse.json({ id: row.id, code: row.code });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create promo code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
