import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState } from "@/lib/store";
import { VERIFY_SESSION_SCOPES } from "@/constants/demo";

// Mints the short-lived credential the embedded element runs on. It is scoped
// to one account and expires in an hour, which is why it is safe to hand to
// the browser and why this route exists at all.
export async function POST() {
  const state = await readState();

  if (!state.accountId) {
    return NextResponse.json({ error: "No account yet" }, { status: 409 });
  }

  try {
    // Without scoped_actions the call still succeeds and hands back a token
    // whose action list is empty, which then fails inside the component with
    // nothing useful to read.
    const created = await whop().accessTokens.create({
      company_id: state.accountId,
      scoped_actions: [...VERIFY_SESSION_SCOPES],
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
