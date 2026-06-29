import type { NextRequest } from "next/server";
import { getCheckoutUrl, getServerEnv } from "./env";
import { FREE_FEATURES, PREMIUM_FEATURES } from "./plans";
import type { EntitlementSnapshot } from "./types";
import { checkWhopAccess, fetchWhopUserInfo } from "./whop";

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice("bearer ".length).trim();
}

export function publicEntitlementError(error: unknown) {
  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return error.message;
  }

  return "Unable to verify Whop access. Please sign in again or refresh access.";
}

function mockEntitlement(token: string): EntitlementSnapshot {
  const tier = token.includes("admin")
    ? "admin"
    : token.includes("premium")
      ? "premium"
      : "free";
  const hasAccess = tier === "premium" || tier === "admin";

  return {
    hasAccess,
    accessLevel: tier === "admin" ? "admin" : hasAccess ? "customer" : "no_access",
    tier,
    source: "mock",
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    checkoutUrl: getCheckoutUrl(),
    billingPortalUrl: getServerEnv().billingPortalFallbackUrl,
    features: hasAccess
      ? PREMIUM_FEATURES
      : getServerEnv().allowFreeAccess
        ? FREE_FEATURES
        : [],
    user: {
      id: `user_mock_${tier}`,
      name: tier === "free" ? "Mock Free User" : "Mock Premium User",
      username: tier,
      email: `${tier}@example.test`
    }
  };
}

export async function resolveEntitlementFromRequest(request: NextRequest) {
  const token = getBearerToken(request);
  const env = getServerEnv();

  if (env.mockMode && (!token || token.startsWith("mock-"))) {
    return mockEntitlement(token || "mock-free");
  }

  if (!token) {
    throw new Error("Missing Whop OAuth access token");
  }

  if (!env.whopResourceId) {
    throw new Error("WHOP_ACCESS_RESOURCE_ID is not configured");
  }

  const user = await fetchWhopUserInfo(token);
  const access = await checkWhopAccess({
    userId: user.sub,
    userAccessToken: token
  });

  const hasAccess =
    access.has_access ||
    access.access_level === "customer" ||
    access.access_level === "admin";
  const accessLevel = access.access_level || (hasAccess ? "customer" : "no_access");

  return {
    hasAccess,
    accessLevel,
    tier: accessLevel === "admin" ? "admin" : hasAccess ? "premium" : "free",
    source: access.source || "whop-user-token",
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    checkoutUrl: getCheckoutUrl(),
    billingPortalUrl: env.billingPortalFallbackUrl,
    features: hasAccess ? PREMIUM_FEATURES : env.allowFreeAccess ? FREE_FEATURES : [],
    user: {
      id: user.sub,
      name: user.name,
      username: user.preferred_username,
      email: user.email,
      picture: user.picture
    }
  } satisfies EntitlementSnapshot;
}
