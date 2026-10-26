import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { getEnv } from "@/lib/env";
import { readState, writeState } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { DEMO_SALE_AMOUNT } from "@/constants/whop-ids";

// Stands in for the seller earning money on our marketplace. A balance transfer
// moves it from our balance to theirs and lands straight away.
export async function POST(request: Request) {
  if (!checkRateLimit(clientIp(request), 5)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const state = await readState();

  if (!state.sellerId) {
    return NextResponse.json({ error: "No seller yet" }, { status: 409 });
  }

  if (state.fundedAmount) {
    return NextResponse.json({ amount: state.fundedAmount, alreadyFunded: true });
  }

  try {
    // The origin is required here even though it is our own account, and this
    // call takes its retry key in the body as idempotence_key, while payouts
    // take it as a request option.
    await whop().transfers.create({
      amount: DEMO_SALE_AMOUNT,
      currency: "usd",
      type: "balance",
      origin_id: getEnv().WHOP_PLATFORM_ACCOUNT_ID,
      destination_id: state.sellerId,
      idempotence_key: `demo-sale-${state.sellerId}`,
      notes: "Marketplace sale proceeds",
    });

    await writeState({ fundedAmount: DEMO_SALE_AMOUNT });

    return NextResponse.json({ amount: DEMO_SALE_AMOUNT, alreadyFunded: false });
  } catch (error) {
    console.error("fund_failed", error);
    return NextResponse.json({ error: "Could not move the sale money" }, { status: 502 });
  }
}
