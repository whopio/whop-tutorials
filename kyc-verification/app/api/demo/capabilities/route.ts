import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState } from "@/lib/store";

// The capabilities that verification actually switches on. Watched flip live
// on 2026-08-06 the moment a check was approved. This is the payoff, and it
// lives on the account rather than on the verification.
const WATCHED = [
  "standard_payout",
  "crypto_payout",
  "transfer",
  "card_issuing",
] as const;

export async function GET() {
  const state = await readState();

  if (!state.accountId) {
    return NextResponse.json({ capabilities: null, requiredActions: null });
  }

  try {
    const account = await whop().accounts.retrieve(state.accountId);
    const all = (account.capabilities ?? {}) as Record<string, string | null>;

    return NextResponse.json({
      capabilities: WATCHED.map((name) => ({ name, state: all[name] ?? "unknown" })),
      // Empty on a brand new account and only populated once a verification
      // exists, so an untouched account tells us nothing either way.
      requiredActions: (account.required_actions ?? []).map((action) => ({
        action: (action as { action?: string }).action ?? "unknown",
        title: (action as { title?: string }).title ?? "",
      })),
    });
  } catch (error) {
    console.error("capabilities_read_failed", error);
    return NextResponse.json({ error: "Could not read the account" }, { status: 502 });
  }
}
