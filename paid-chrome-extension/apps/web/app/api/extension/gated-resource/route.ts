import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { publicEntitlementError, resolveEntitlementFromRequest } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export async function POST(request: NextRequest) {
  let entitlement: Awaited<ReturnType<typeof resolveEntitlementFromRequest>>;

  try {
    entitlement = await resolveEntitlementFromRequest(request);
  } catch (error) {
    return jsonWithCors(
      request,
      {
        ok: false,
        code: "auth_failed",
        message: publicEntitlementError(error)
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!entitlement.hasAccess) {
    return jsonWithCors(
      request,
      {
        ok: false,
        code: "premium_required",
        message: "Whop access is required before this extension feature unlocks.",
        entitlement
      },
      { status: 402, headers: { "Cache-Control": "no-store" } }
    );
  }

  return jsonWithCors(
    request,
    {
      ok: true,
      entitlement,
      resource: {
        title: "Whop verified premium feature",
        items: [
          "The user is signed in with Whop.",
          "The API rechecked the configured resource ID.",
          "Replace this payload with your extension's paid feature."
        ]
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
