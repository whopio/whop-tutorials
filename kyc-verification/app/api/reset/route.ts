import { NextResponse } from "next/server";
import { clearState } from "@/lib/store";

// Forgets this visitor's account and check so the page can be run again. The
// account and the verification themselves stay where they are on Whop.
export async function POST() {
  await clearState();
  return NextResponse.json({ ok: true });
}
