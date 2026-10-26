import { z } from "zod";
import { prisma } from "@/lib/db";

// Whop's payment webhook payload only guarantees a small set of fields —
// `data.plan.plan_type` is NOT returned on webhooks, only when you
// retrieve the plan separately. We parse defensively and derive the
// plan type from the plan id instead.
const paymentSchema = z.object({
  id: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  plan: z.object({ id: z.string() }).optional(),
  plan_id: z.string().nullish(),
  billing_reason: z.string().nullish(),
});

const membershipSchema = z.object({
  id: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  plan: z.object({ id: z.string() }).optional(),
});

function readUserId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).userId;
  return typeof value === "string" ? value : null;
}

function planTypeFromPlanId(
  planId: string | undefined,
): "subscription" | "lifetime" | null {
  if (!planId) return null;
  if (planId === process.env.NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID) {
    return "subscription";
  }
  if (planId === process.env.NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID) {
    return "lifetime";
  }
  return null;
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });
  return existing !== null;
}

async function markProcessed(eventId: string, type: string): Promise<void> {
  try {
    await prisma.webhookEvent.create({ data: { id: eventId, type } });
  } catch {
  }
}

export async function handlePaymentSucceeded(eventId: string, data: unknown) {
  if (await alreadyProcessed(eventId)) return;

  let payment: z.infer<typeof paymentSchema>;
  try {
    payment = paymentSchema.parse(data);
  } catch (err) {
    console.error("[webhook] payment.succeeded parse failed:", err, "payload:", data);
    return;
  }

  const userId = readUserId(payment.metadata);
  if (!userId) {
    console.error(
      "[webhook] payment.succeeded with no userId metadata",
      payment.id,
    );
    return;
  }

  const planId = payment.plan_id ?? payment.plan?.id;
  const planType = planTypeFromPlanId(planId);
  if (!planType) {
    console.error(
      "[webhook] payment.succeeded with unrecognized plan id:",
      planId,
    );
    return;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: "pro", planType, planSince: new Date() },
    });
  } catch (err) {
    console.error("[webhook] payment.succeeded DB update failed:", err);
    return;
  }

  await markProcessed(eventId, "payment.succeeded");
}

export async function handleMembershipDeactivated(eventId: string, data: unknown) {
  if (await alreadyProcessed(eventId)) return;

  let membership: z.infer<typeof membershipSchema>;
  try {
    membership = membershipSchema.parse(data);
  } catch (err) {
    console.error("[webhook] membership.deactivated parse failed:", err);
    return;
  }

  const userId = readUserId(membership.metadata);
  if (!userId) return;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: "free", planType: null, planSince: null },
    });
  } catch (err) {
    console.error("[webhook] membership.deactivated DB update failed:", err);
    return;
  }

  await markProcessed(eventId, "membership.deactivated");
}
