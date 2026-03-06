import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { whop } from "@/lib/whop";
import { PLATFORM_FEE_PERCENT } from "@/constants/config";

const checkoutSchema = z.object({
  writerId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`checkout:${user.id}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { writerId } = parsed.data;

  const writer = await prisma.writer.findUnique({ where: { id: writerId } });
  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }
  if (!writer.kycCompleted) {
    return NextResponse.json(
      { error: "Writer has not completed KYC" },
      { status: 400 }
    );
  }
  if (!writer.whopCompanyId) {
    return NextResponse.json(
      { error: "Writer does not have a connected account" },
      { status: 400 }
    );
  }

  // Check existing subscription
  const existingSub = await prisma.subscription.findUnique({
    where: { userId_writerId: { userId: user.id, writerId } },
  });
  if (existingSub && existingSub.status === "ACTIVE") {
    return NextResponse.json(
      { error: "You are already subscribed to this writer" },
      { status: 409 }
    );
  }

  const priceInCents = writer.monthlyPriceInCents ?? 0;
  const priceInDollars = priceInCents / 100;
  const applicationFee = Math.round(priceInCents * PLATFORM_FEE_PERCENT) / 10000;

  // Create checkout configuration with inline plan (Direct Charge)
  const checkout = await whop.checkoutConfigurations.create({
    plan: {
      company_id: writer.whopCompanyId,
      currency: "usd",
      renewal_price: priceInDollars,
      billing_period: 30,
      plan_type: "renewal",
      release_method: "buy_now",
      application_fee_amount: applicationFee,
      product: {
        external_identifier: `penstack-writer-${writer.id}`,
        title: `${writer.name} Subscription`,
      },
    },
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/${writer.handle}`,
    metadata: {
      userId: user.id,
      writerId: writer.id,
    },
  });

  return NextResponse.json({ url: checkout.purchase_url });
}
