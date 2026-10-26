import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getWhop } from "@/lib/whop";
import { PLANS, planIdFor, type PlanKey } from "@/lib/plans";
import { env } from "@/lib/env";

function isPlanKey(value: FormDataEntryValue | null): value is PlanKey {
  return value === "subscription" || value === "lifetime";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const form = await request.formData();
  const plan = form.get("plan");

  if (!isPlanKey(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planId = planIdFor(plan);

  const whop = getWhop();
  const config = await whop.checkoutConfigurations.create({
    plan_id: planId,
    mode: "payment",
    redirect_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/complete`,
    metadata: { userId: user.id },
  });

  const sessionId = (config as { id: string }).id;

  const url = new URL("/checkout", env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("session", sessionId);
  url.searchParams.set("plan", PLANS[plan].planKey);

  return NextResponse.redirect(url, { status: 303 });
}
