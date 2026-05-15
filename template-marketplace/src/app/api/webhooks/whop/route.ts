import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import type Whop from "@whop/sdk";
import { prisma } from "@/lib/prisma";
import { whopApp } from "@/lib/whop";

type WebhookEvent = ReturnType<Whop["webhooks"]["unwrap"]>;
type PaymentSucceededEvent = Extract<WebhookEvent, { type: "payment.succeeded" }>;
type PaymentData = PaymentSucceededEvent["data"];

/**
 * Whop webhook handler.
 *
 * Configured as a company-level webhook on the platform parent company,
 * with "connected account events" enabled so events from sellers'
 * connected companies fire here too.
 *
 * Returns 200 even on internal failures so Whop doesn't retry forever ,
 * we log errors for offline inspection. Signature failures still 401.
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: WebhookEvent;
  try {
    event = whopApp.webhooks.unwrap(bodyText, { headers });
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 401 });
  }

  // Idempotency, try to insert the event ID; if it already exists we've
  // processed this delivery before and can short-circuit.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return new Response("Already processed", { status: 200 });
    }
    console.error("Webhook event idempotency insert failed", err);
    return new Response("OK", { status: 200 });
  }

  try {
    if (event.type === "payment.succeeded") {
      await handlePaymentSucceeded(event.data);
    }
    // All other event types are subscribed but unhandled for now ,
    // returning 200 stops Whop's retries.
  } catch (err) {
    console.error("Webhook handler error", { type: event.type, err });
  }

  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceeded(payment: PaymentData) {
  if (!payment.plan?.id || !payment.user?.id) {
    console.warn("payment.succeeded missing plan or user", {
      paymentId: payment.id,
      planId: payment.plan?.id,
      userId: payment.user?.id,
    });
    return;
  }

  // Find the Template by the Whop plan ID we stored at publish time.
  const template = await prisma.template.findFirst({
    where: { whopPlanId: payment.plan.id },
    select: { id: true },
  });
  if (!template) {
    console.warn("payment.succeeded for unknown plan", { planId: payment.plan.id });
    return;
  }

  // Match the buyer to a local User (or create one). The Whop sandbox
  // checkout collects the buyer's Whop identity, so payment.user.id maps
  // 1:1 to our User.whopUserId for buyers who've signed in to Stax. If
  // they haven't, we still create a User row so the purchase isn't lost.
  const user = await prisma.user.upsert({
    where: { whopUserId: payment.user.id },
    create: {
      whopUserId: payment.user.id,
      email: payment.user.email ?? `${payment.user.id}@unknown.whop`,
      name: payment.user.name ?? payment.user.username ?? null,
    },
    update: {
      ...(payment.user.email && { email: payment.user.email }),
      ...(payment.user.name && { name: payment.user.name }),
    },
  });

  // Whop sends subtotal in dollars; we store cents.
  const pricePaidCents = Math.round((payment.subtotal ?? payment.total ?? 0) * 100);

  await prisma.purchase.upsert({
    where: {
      userId_templateId: { userId: user.id, templateId: template.id },
    },
    create: {
      userId: user.id,
      templateId: template.id,
      whopPaymentId: payment.id,
      pricePaid: pricePaidCents,
    },
    update: {
      whopPaymentId: payment.id,
      pricePaid: pricePaidCents,
    },
  });
}
