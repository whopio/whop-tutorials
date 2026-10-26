import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { whop } from "@/lib/whop";
import { readState, writeState } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const body = z.object({
  amount: z.number().min(10).max(100),
  platformCoversFees: z.boolean(),
});

export async function POST(request: Request) {
  if (!checkRateLimit(clientIp(request), 5)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const state = await readState();

  if (!state.sellerId) {
    return NextResponse.json({ error: "No seller yet" }, { status: 409 });
  }
  if (!state.payoutMethodId) {
    return NextResponse.json({ error: "No payout method yet" }, { status: 409 });
  }

  // Reused across attempts on purpose. A fresh key per request would protect
  // nothing, because the retry would carry a new key and earn a second payment.
  const paymentRecordId = state.paymentRecordId ?? randomUUID();
  await writeState({ paymentRecordId });

  try {
    const withdrawal = await whop().payouts.create(
      {
        amount: parsed.data.amount,
        account_id: state.sellerId,
        currency: "usd",
        payout_method_id: state.payoutMethodId,
        platform_covers_fees: parsed.data.platformCoversFees,
      },
      { idempotencyKey: paymentRecordId },
    );

    // Amounts come back as decimal strings, and a payout that stopped says why
    // in failure.
    const amount = Number(withdrawal.amount);
    const feeAmount = Number(withdrawal.fee_amount);

    await writeState({
      withdrawalId: withdrawal.id,
      status: withdrawal.status,
      amount,
      feeAmount,
      platformCoversFees: parsed.data.platformCoversFees,
      errorCode: withdrawal.failure?.code ?? null,
      errorMessage: withdrawal.failure?.message ?? null,
    });

    return NextResponse.json({
      withdrawalId: withdrawal.id,
      status: withdrawal.status,
      amount,
      feeAmount,
      estimatedArrival: withdrawal.estimated_arrival,
    });
  } catch (error) {
    console.error("pay_failed", error);
    const message =
      error instanceof Error && error.message.includes("balance")
        ? "Not enough available balance to send this payment"
        : "Could not send the payment";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
