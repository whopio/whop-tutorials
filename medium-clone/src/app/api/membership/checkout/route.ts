import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

const Schema = z.object({
  promoCode: z.string().trim().min(1).max(64).optional(),
});

function checkoutEnvironment() {
  return process.env.WHOP_SANDBOX === "true" ? "sandbox" : "production";
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const returnUrl = `${env.NEXT_PUBLIC_APP_URL}/me/membership`;
    const checkout = await getCompanyWhop().checkoutConfigurations.create({
      plan_id: env.STORYLINE_PLUS_PLAN_ID,
      ...(returnUrl.startsWith("https://") ? { redirect_url: returnUrl } : {}),
      source_url: `${env.NEXT_PUBLIC_APP_URL}/membership`,
      ...(parsed.data.promoCode ? { promo_code: parsed.data.promoCode } : {}),
      metadata: {
        kind: "plus",
        userId: user.id,
        ...(parsed.data.promoCode ? { promoCode: parsed.data.promoCode } : {}),
      },
    });
    return NextResponse.json({
      sessionId: checkout.id,
      planId: checkout.plan?.id ?? env.STORYLINE_PLUS_PLAN_ID,
      environment: checkoutEnvironment(),
      returnUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
