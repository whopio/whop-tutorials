import { NextRequest, NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Next.js must not parse the body. We need the raw string for signature verification.
export const dynamic = "force-dynamic";

type WhopEventEnvelope = {
  id: string;
  type: string;
  data: { id?: unknown; metadata?: unknown } & Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Convert Next.js headers to a plain object for the SDK's unwrap()
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Verify signature and parse event (throws if invalid)
  let event: WhopEventEnvelope;
  try {
    event = whop.webhooks.unwrap(rawBody, {
      headers,
    }) as unknown as WhopEventEnvelope;
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Idempotency. Whop retries on non-2xx, so we must short-circuit replays.
  // Insert the event ID first; a P2002 unique-violation means we've already
  // processed this exact event and can return 200 immediately.
  try {
    await prisma.webhookEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      console.log(`[webhook] duplicate ${event.id}, skipping`);
      return NextResponse.json({ received: true, deduped: true });
    }
    throw err;
  }

  console.log(`[webhook] received: ${event.type} (${event.id})`);

  if (event.type === "payment.succeeded") {
    const paymentId = event.data.id as string;
    await handlePaymentSucceeded(paymentId);
  }

  if (event.type === "payment.failed") {
    const paymentId = event.data.id as string;
    await handlePaymentFailed(paymentId);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(paymentId: string) {
  // Find unlock by whop payment ID (set when checkout was created or on redirect)
  const existing = await prisma.unlock.findUnique({
    where: { whopPaymentId: paymentId },
  });

  if (existing) {
    if (existing.status !== "PAID") {
      await prisma.unlock.update({
        where: { id: existing.id },
        data: { status: "PAID" },
      });
      console.log(`[webhook] unlock ${existing.id} marked PAID`);
    }
    return;
  }

  // No unlock matched by payment ID yet. Find a PENDING unlock without a payment ID.
  // This handles the case where the redirect didn't fire
  const payment = await whop.payments.retrieve(paymentId);
  const unlockId = (payment.metadata as Record<string, string> | null)
    ?.unlock_id;

  if (unlockId) {
    await prisma.unlock.updateMany({
      where: { id: unlockId, status: "PENDING" },
      data: { status: "PAID", whopPaymentId: paymentId },
    });
    console.log(`[webhook] unlock ${unlockId} marked PAID via metadata`);
  } else {
    console.warn(
      `[webhook] payment.succeeded: no unlock found for payment ${paymentId}`
    );
  }
}

async function handlePaymentFailed(paymentId: string) {
  const existing = await prisma.unlock.findUnique({
    where: { whopPaymentId: paymentId },
  });

  if (existing) {
    await prisma.unlock.update({
      where: { id: existing.id },
      data: { status: "FAILED" },
    });
    console.log(`[webhook] unlock ${existing.id} marked FAILED`);
  }
}
