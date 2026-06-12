import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { applicationFeeCents } from "@/lib/fees";
import { createCheckoutConfiguration } from "@/services/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { COFFEE_UNIT_CENTS, MIN_TIP_CENTS, MAX_TIP_CENTS } from "@/constants";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tip"),
    creatorUsername: z.string().min(1),
    amountCents: z.number().int().min(MIN_TIP_CENTS).max(MAX_TIP_CENTS),
    supporterName: z.string().max(60).optional(),
    message: z.string().max(500).optional(),
    isPublic: z.boolean().optional().default(true),
  }),
  z.object({
    kind: z.literal("membership"),
    creatorUsername: z.string().min(1),
    tierId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("shop"),
    creatorUsername: z.string().min(1),
    productId: z.string().min(1),
  }),
]);

export async function POST(req: NextRequest) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  const creator = await prisma.creator.findUnique({
    where: { username: input.creatorUsername },
    select: {
      id: true,
      displayName: true,
      whopCompanyId: true,
      goals: { where: { isActive: true }, take: 1, select: { id: true } },
    },
  });
  if (!creator || !creator.whopCompanyId) {
    return NextResponse.json({ error: "Creator not found or not ready for payments" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const returnUrl = `${appUrl}/${input.creatorUsername}?status=success`;

  let amountCents: number;
  let planType: "one_time" | "renewal";
  let title: string;
  let metadata: Record<string, string>;

  if (input.kind === "tip") {
    amountCents = input.amountCents;
    planType = "one_time";
    title = `Tip for ${creator.displayName}`;
    const displayName = (input.supporterName?.trim() || user?.name || user?.username || "Someone").slice(0, 60);
    const coffees = Math.max(1, Math.round(amountCents / COFFEE_UNIT_CENTS));
    const support = await prisma.support.create({
      data: {
        creatorId: creator.id,
        supporterUserId: user?.id ?? null,
        supporterName: displayName,
        message: input.message?.trim() || null,
        amountCents,
        coffees,
        isPublic: input.isPublic,
        status: "PENDING",
        goalId: creator.goals[0]?.id ?? null,
      },
    });
    metadata = { kind: "tip", ref: support.id, supportId: support.id, creatorId: creator.id };
  } else if (input.kind === "shop") {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, creatorId: creator.id, isActive: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    amountCents = product.priceCents;
    planType = "one_time";
    title = product.title;
    const buyerName = (user?.name || user?.username || "Someone").slice(0, 60);
    const order = await prisma.order.create({
      data: {
        creatorId: creator.id,
        productId: product.id,
        buyerUserId: user?.id ?? null,
        buyerName,
        amountCents,
        status: "PENDING",
      },
    });
    if (amountCents <= 0) {
      // Free product: no payment required, fulfill immediately.
      await prisma.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
      await prisma.product.update({ where: { id: product.id }, data: { salesCount: { increment: 1 } } });
      return NextResponse.json({ free: true, downloadUrl: product.downloadUrl ?? null });
    }
    metadata = { kind: "shop", ref: order.id, orderId: order.id, creatorId: creator.id };
  } else {
    // membership
    if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const tier = await prisma.tier.findFirst({
      where: { id: input.tierId, creatorId: creator.id, isActive: true },
    });
    if (!tier) return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    amountCents = tier.priceCents;
    planType = "renewal";
    title = `${tier.name} — ${creator.displayName}`;
    metadata = {
      kind: "membership",
      ref: crypto.randomUUID(),
      creatorId: creator.id,
      tierId: tier.id,
      userId: user.id,
    };
  }

  try {
    const checkout = await createCheckoutConfiguration({
      connectedCompanyId: creator.whopCompanyId,
      amountCents,
      applicationFeeCents: applicationFeeCents(amountCents),
      planType,
      title,
      redirectUrl: returnUrl,
      metadata: metadata as { kind: "tip" | "membership" | "shop" } & Record<string, string>,
    });
    return NextResponse.json({ ...checkout, ref: metadata.ref });
  } catch (err: unknown) {
    console.error("Checkout creation failed:", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
