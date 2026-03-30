import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session.accessToken || !session.whopUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const companyId = request.nextUrl.searchParams.get("companyId");

  if (companyId) {
    // Company-scoped token for embedded chat on connected accounts
    const whop = getWhop();
    const result = await whop.accessTokens.create({
      company_id: companyId,
      user_id: session.whopUserId,
    });
    return NextResponse.json({ token: result.token });
  }

  return NextResponse.json({ token: session.accessToken });
}
