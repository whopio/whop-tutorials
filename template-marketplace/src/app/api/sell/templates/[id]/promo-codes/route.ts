import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

const createSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, hyphen, or underscore only"),
  promoType: z.enum(["percentage", "flat_amount"]),
  amountOff: z.number().positive(),
  expiresAt: z.string().datetime().nullable().optional(),
  stock: z.number().int().positive().nullable().optional(),
  onePerCustomer: z.boolean().default(true),
});

async function loadOwnedTemplate(id: string, userId: string) {
  return prisma.template.findFirst({
    where: { id, sellerProfile: { userId } },
    include: { sellerProfile: { select: { whopCompanyId: true } } },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const template = await loadOwnedTemplate(id, session.userId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (!template.whopProductId) {
    return NextResponse.json({ codes: [] });
  }

  try {
    const codes = [];
    for await (const code of whopCompany.promoCodes.list({
      company_id: template.sellerProfile.whopCompanyId,
      product_ids: [template.whopProductId],
    })) {
      codes.push(code);
      if (codes.length >= 50) break;
    }
    return NextResponse.json({ codes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Promo code list failed", { templateId: id, message });
    return NextResponse.json(
      { error: "Couldn't load promo codes", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const template = await loadOwnedTemplate(id, session.userId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (!template.whopProductId) {
    return NextResponse.json(
      { error: "Publish the template before issuing codes" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", detail: parsed.error.message },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // 100%-off codes break the application_fee_amount math (the platform fee
  // can't exceed the total). Free distribution should use the free-template
  // path (price = 0 + Get for free), not a 100% code on a paid plan.
  if (input.promoType === "percentage" && input.amountOff >= 100) {
    return NextResponse.json(
      {
        error:
          "100%-off codes can't be applied to paid templates because of the platform fee. Set the template's price to $0 instead.",
      },
      { status: 400 },
    );
  }
  if (input.promoType === "percentage" && input.amountOff > 100) {
    return NextResponse.json(
      { error: "Percentage discount can't exceed 100" },
      { status: 400 },
    );
  }

  const normalizedCode = input.code.toUpperCase();

  try {
    const created = await whopCompany.promoCodes.create({
      company_id: template.sellerProfile.whopCompanyId,
      product_id: template.whopProductId,
      code: normalizedCode,
      promo_type: input.promoType,
      amount_off: input.amountOff,
      base_currency: "usd",
      new_users_only: false,
      promo_duration_months: 1,
      expires_at: input.expiresAt ?? null,
      stock: input.stock ?? null,
      unlimited_stock: input.stock == null,
      one_per_customer: input.onePerCustomer,
    });
    return NextResponse.json({ code: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;

    // Detect "code already exists" from Whop's response. The SDK throws on
    // 4xx with the API's message embedded in `err.message`. Whop's exact
    // wording can vary (e.g. "code is already in use", "code has already
    // been taken"), so we substring-match a few common forms.
    const lc = message.toLowerCase();
    const isDuplicate =
      status === 409 ||
      status === 422 ||
      lc.includes("already") ||
      lc.includes("duplicate") ||
      lc.includes("taken") ||
      lc.includes("in use");

    if (isDuplicate) {
      return NextResponse.json(
        {
          error: `A promo code "${normalizedCode}" already exists. Pick a different code.`,
        },
        { status: 409 },
      );
    }

    // Other 4xx errors from Whop: surface the raw message, usually
    // helpful (e.g. "amount_off must be greater than 0").
    if (status >= 400 && status < 500) {
      return NextResponse.json(
        { error: message.slice(0, 500) },
        { status },
      );
    }

    console.error("Promo code create failed", { templateId: id, status, message });
    return NextResponse.json(
      { error: "Couldn't create promo code", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
