import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { getServerEnv } from "@/lib/env";
import { fetchWhopUserInfo, findBillingPortalUrl } from "@/lib/whop";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice("bearer ".length).trim()
    : "";

  if (!token || token.startsWith("mock-")) {
    return jsonWithCors(
      request,
      { url: env.billingPortalFallbackUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const user = await fetchWhopUserInfo(token);
    const url = await findBillingPortalUrl({
      userId: user.sub,
      userAccessToken: token
    });
    return jsonWithCors(request, { url }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonWithCors(
      request,
      { url: env.billingPortalFallbackUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
