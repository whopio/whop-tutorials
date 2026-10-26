import { NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { readState, writeState } from "@/lib/store";
import { parseVerification } from "@/lib/verification-schema";

export async function GET() {
  const state = await readState();

  if (!state.verificationId) {
    return NextResponse.json({ record: null });
  }

  try {
    const record = parseVerification(
      await whop().verifications.retrieve({ id: state.verificationId }),
    );
    await writeState({ status: record.status });
    return NextResponse.json({ record });
  } catch (error) {
    console.error("verification_read_failed", error);
    return NextResponse.json({ error: "Could not read the check" }, { status: 502 });
  }
}
