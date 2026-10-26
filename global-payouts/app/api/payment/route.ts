import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState, writeState } from "@/lib/store";

// The timeline polls this. Webhooks move the stored status, and this also reads
// the payout back so the demo still advances if a delivery is delayed.
export async function GET() {
  const state = await readState();

  if (!state.withdrawalId) {
    return NextResponse.json({ status: null });
  }

  let status = state.status ?? null;
  let errorCode = state.errorCode ?? null;
  let errorMessage = state.errorMessage ?? null;
  let feeAmount = state.feeAmount ?? null;

  try {
    const withdrawal = await whop().payouts.retrieve({ id: state.withdrawalId });
    status = withdrawal.status;
    errorCode = withdrawal.failure?.code ?? null;
    errorMessage = withdrawal.failure?.message ?? null;
    if (withdrawal.fee_amount !== undefined) feeAmount = Number(withdrawal.fee_amount);
    await writeState({ status, errorCode, errorMessage, feeAmount: feeAmount ?? undefined });
  } catch (error) {
    console.error("payment_read_failed", error);
  }

  return NextResponse.json({
    withdrawalId: state.withdrawalId,
    status,
    amount: state.amount ?? null,
    feeAmount,
    platformCoversFees: state.platformCoversFees ?? false,
    errorCode,
    errorMessage,
  });
}
