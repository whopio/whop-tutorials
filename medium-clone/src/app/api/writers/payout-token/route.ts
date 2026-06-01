import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCompanyWhop } from "@/lib/whop";

/**
 * Mints a short-lived access token scoped to the writer's Whop sub-company.
 * Consumed by the PayoutsSession embed on /me/dashboard. Default TTL is 1h.
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth({ include: { writerProfile: true } });
  const companyId = req.nextUrl.searchParams.get("companyId");

  if (!companyId || companyId !== user.writerProfile?.whopCompanyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = await getCompanyWhop().accessTokens.create({ company_id: companyId });
    return NextResponse.json({ token: token.token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not mint token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
