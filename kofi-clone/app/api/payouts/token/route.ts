import { NextRequest, NextResponse } from "next/server";
import { requireCreator } from "@/lib/auth";
import { createCompanyAccessToken } from "@/services/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Mints a short-lived access token the embedded payout portal uses to talk to
// Whop on behalf of the creator's connected company. Guarded so a creator can
// only ever request a token for their OWN connected company.
export async function GET(req: NextRequest) {
  if (!rateLimit(`payouts-token:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { creator } = await requireCreator();

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  // Hard ownership check: never mint a token for someone else's company.
  if (!creator.whopCompanyId || companyId !== creator.whopCompanyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = await createCompanyAccessToken(companyId);
    return NextResponse.json({ token });
  } catch (err: unknown) {
    console.error("Payout token creation failed:", err);
    return NextResponse.json({ error: "Could not create payout token" }, { status: 502 });
  }
}
