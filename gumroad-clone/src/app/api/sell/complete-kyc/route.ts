// src/app/api/sell/complete-kyc/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { completeKycIfNeeded } from "@/lib/auth";

// Called when a seller returns from Whop's KYC flow.
// Anyone can open the return URL, so completeKycIfNeeded asks Whop
// whether the identity check is approved before it sets kycComplete.
export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kycComplete = await completeKycIfNeeded(session.userId);

  return NextResponse.json({ kycComplete }, { status: kycComplete ? 200 : 409 });
}
