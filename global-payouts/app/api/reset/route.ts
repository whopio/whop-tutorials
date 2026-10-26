import { NextResponse } from "next/server";
import { clearState } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Clears this visitor's walkthrough. The seller account it created stays on
// Whop, because a real account is not something a demo should delete.
export async function POST(request: Request) {
  if (!checkRateLimit(clientIp(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  await clearState();
  return NextResponse.json({ reset: true });
}
