import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

const Schema = z.object({
  amountCents: z.number().int().min(100).max(50_000), // $1 - $500
});

function checkoutEnvironment() {
  return process.env.WHOP_SANDBOX === "true" ? "sandbox" : "production";
}

function safeReturnUrl(req: NextRequest) {
  const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
  const referer = req.headers.get("referer");
  if (!referer) return appUrl.toString();

  try {
    const url = new URL(referer);
    if (url.origin === appUrl.origin) return url.toString();
  } catch {
    // Ignore malformed referers and fall back to the app root.
  }

  return appUrl.toString();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const { amountCents } = parsed.data;

  const story = await prisma.story.findUnique({
    where: { id },
    include: { author: { include: { writerProfile: true } } },
  });
  if (!story || story.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Story not available" }, { status: 404 });
  }
  if (story.author.id === user.id && process.env.WHOP_SANDBOX !== "true") {
    // Allowed in sandbox so you can test the full flow end-to-end.
    return NextResponse.json({ error: "Cannot tip your own story" }, { status: 400 });
  }
  if (!story.author.writerProfile?.kycComplete || !story.author.writerProfile.tippingEnabled) {
    return NextResponse.json(
      { error: "This writer hasn't enabled tipping yet" },
      { status: 400 },
    );
  }

  const feePercent = Number(env.TIP_PLATFORM_FEE_PERCENT);
  const feeCents = Math.max(1, Math.round((amountCents * feePercent) / 100));

  try {
    const returnUrl = safeReturnUrl(req);
    const checkout = await getCompanyWhop().checkoutConfigurations.create({
      ...(returnUrl.startsWith("https://") ? { redirect_url: returnUrl } : {}),
      source_url: returnUrl,
      plan: {
        company_id: story.author.writerProfile.whopCompanyId,
        initial_price: amountCents / 100,
        plan_type: "one_time",
        currency: "usd",
        application_fee_amount: feeCents / 100,
      },
      metadata: {
        kind: "tip",
        storyId: story.id,
        tipperUserId: user.id,
        writerUserId: story.author.id,
        amountCents: String(amountCents),
        applicationFeeCents: String(feeCents),
      },
    });
    if (!checkout.plan?.id) {
      return NextResponse.json(
        { error: "Whop did not return a plan for this checkout" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      sessionId: checkout.id,
      planId: checkout.plan.id,
      environment: checkoutEnvironment(),
      returnUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start tip";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
