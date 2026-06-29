import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { publicEntitlementError, resolveEntitlementFromRequest } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export async function POST(request: NextRequest) {
  try {
    const entitlement = await resolveEntitlementFromRequest(request);
    return jsonWithCors(request, entitlement, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return jsonWithCors(
      request,
      {
        hasAccess: false,
        accessLevel: "no_access",
        tier: "free",
        error: publicEntitlementError(error)
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
