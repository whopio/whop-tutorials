import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState, writeState } from "@/lib/store";
import { parseVerification } from "@/lib/verification-schema";

// Every panel comes back through here after anything changes. The link to the
// hosted screen is never cached, because it is in the response only while the
// person still has something to do, and it expires 7 days after it was made.
// Whatever comes back is what we show, including nothing at all.
export async function GET() {
  const state = await readState();

  if (!state.verificationId) {
    return NextResponse.json({ record: null });
  }

  try {
    const record = parseVerification(
      await whop().verifications.retrieve(state.verificationId),
    );
    await writeState({ status: record.status });
    return NextResponse.json({ record });
  } catch (error) {
    console.error("verification_read_failed", error);
    return NextResponse.json({ error: "Could not read the check" }, { status: 502 });
  }
}
