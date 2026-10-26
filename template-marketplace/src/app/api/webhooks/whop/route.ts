import type { NextRequest } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { webhookSecret } from "@/lib/whop";

type WebhookEvent = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};
type PaymentData = WebhookEvent["data"];

// Depending on the webhook's API version, Whop sends the payment with nested
// objects (plan.id) and plain numbers, or with flat IDs (plan_id) and money
// objects ({ amount: "9.99" }). These helpers read both shapes.
function str(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function dollars(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  const amount = Number(field(value, "amount"));
  return Number.isFinite(amount) ? amount : undefined;
}

/**
 * Whop webhook handler.
 *
 * Configured as a company-level webhook on the platform parent company,
 * with "connected account events" enabled so events from sellers'
 * connected companies fire here too.
 *
 * Returns 200 even on internal failures so Whop doesn't retry forever.
 * We log errors for offline inspection. Signature failures still 401.
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: WebhookEvent;
  try {
    event = unwrapWebhook<WebhookEvent>(bodyText, { headers, key: webhookSecret });
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 401 });
  }

  // Idempotency: try to insert the event ID. If it already exists we've
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
    // All other event types are subscribed but unhandled for now.
    // Returning 200 stops Whop's retries.
  } catch (err) {
    console.error("Webhook handler error", { type: event.type, err });
  }

  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceeded(payment: PaymentData) {
  const paymentId = str(payment.id);
  const planId = str(payment.plan_id) ?? str(field(payment.plan, "id"));
  const whopUserId = str(field(payment.user, "id"));

  if (!paymentId || !planId || !whopUserId) {
    console.warn("payment.succeeded missing plan or user", {
      paymentId,
      planId,
      userId: whopUserId,
    });
    return;
  }

  // Find the Template by the Whop plan ID we stored at publish time.
  const template = await prisma.template.findFirst({
    where: { whopPlanId: planId },
    select: { id: true },
  });
  if (!template) {
    console.warn("payment.succeeded for unknown plan", { planId });
    return;
  }

  // Match the buyer to a local User (or create one). The Whop checkout
  // collects the buyer's Whop identity, so the payment's user ID maps 1:1
  // to our User.whopUserId for buyers who've signed in to Stax. If they
  // haven't, we still create a User row so the purchase isn't lost. The
  // legacy payload carries the email on user, the current one on
  // customer_email.
  const email = str(field(payment.user, "email")) ?? str(payment.customer_email);
  const name = str(field(payment.user, "name"));

  const user = await prisma.user.upsert({
    where: { whopUserId },
    create: {
      whopUserId,
      email: email ?? `${whopUserId}@unknown.whop`,
      name: name ?? str(field(payment.user, "username")) ?? null,
    },
    update: {
      ...(email && { email }),
      ...(name && { name }),
    },
  });

  // Whop sends amounts in dollars. We store cents.
  const pricePaidCents = Math.round(
    (dollars(payment.subtotal) ?? dollars(payment.total) ?? 0) * 100,
  );

  await prisma.purchase.upsert({
    where: {
      userId_templateId: { userId: user.id, templateId: template.id },
    },
    create: {
      userId: user.id,
      templateId: template.id,
      whopPaymentId: paymentId,
      pricePaid: pricePaidCents,
    },
    update: {
      whopPaymentId: paymentId,
      pricePaid: pricePaidCents,
    },
  });
}
