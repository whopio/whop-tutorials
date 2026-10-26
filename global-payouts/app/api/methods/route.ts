import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState, writeState } from "@/lib/store";
import { DEMO_PAYOUT_AMOUNT } from "@/constants/whop-ids";

// Reads back what the seller saved through Whop's own form. We get an id and a
// masked label, never the bank account number behind it.
export async function GET() {
  const state = await readState();

  if (!state.sellerId) {
    return NextResponse.json({ error: "No seller yet" }, { status: 409 });
  }

  try {
    const page = await whop().payouts.methods.list({
      account_id: state.sellerId,
      amount: DEMO_PAYOUT_AMOUNT,
    });

    const methods = page.data;
    const chosen = methods.find((m) => m.is_default) ?? methods[0];

    if (chosen) {
      await writeState({
        payoutMethodId: chosen.id,
        payoutMethodLabel:
          chosen.nickname ?? chosen.payer_name ?? chosen.institution_name ?? "Payout method",
      });
    }

    return NextResponse.json({
      methods: methods.map((m) => ({
        id: m.id,
        label: m.nickname ?? m.payer_name ?? m.institution_name ?? "Payout method",
        reference: m.account_reference,
        currency: m.destination_currency,
        isDefault: m.is_default,
        status: m.status,
        fee: m.quote?.standard?.fee ?? null,
        received: m.quote?.standard?.total_received ?? null,
        arrivesOn: m.estimated_arrival?.standard ?? null,
      })),
    });
  } catch (error) {
    console.error("methods_failed", error);
    return NextResponse.json({ error: "Could not read the payout methods" }, { status: 502 });
  }
}
