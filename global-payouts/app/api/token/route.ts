import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState } from "@/lib/store";
import { PAYOUT_SESSION_SCOPES } from "@/constants/whop-ids";

// Mints the short-lived credential the embedded components run on. It is
// scoped to one seller and expires in an hour, which is why it is safe to hand
// to the browser and why this route exists at all.
export async function POST() {
  const state = await readState();

  if (!state.sellerId) {
    return NextResponse.json({ error: "No seller yet" }, { status: 409 });
  }

  try {
    // Without scoped_actions the call still succeeds and returns a token whose
    // action list is empty, which then fails inside the component with nothing
    // useful to read.
    const created = await whop().accessTokens.create({
      account_id: state.sellerId,
      scoped_actions: [...PAYOUT_SESSION_SCOPES],
    });

    return NextResponse.json({
      token: created.token,
      expiresAt: created.expires_at,
    });
  } catch (error) {
    console.error("token_create_failed", error);
    return NextResponse.json({ error: "Could not create a session" }, { status: 502 });
  }
}
