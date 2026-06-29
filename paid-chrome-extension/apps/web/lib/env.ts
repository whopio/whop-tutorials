function readEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function readBoolean(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getServerEnv() {
  const whopApiKey = readEnv("WHOP_API_KEY");
  const mockMode = readBoolean("WHOP_MOCK_MODE", false);

  if (mockMode && process.env.NODE_ENV === "production") {
    throw new Error(
      "WHOP_MOCK_MODE must be disabled in production. Remove it or set it to false."
    );
  }

  return {
    publicAppUrl: readEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    whopAppId: readEnv("NEXT_PUBLIC_WHOP_APP_ID"),
    whopResourceId: readEnv("WHOP_ACCESS_RESOURCE_ID") || readEnv("WHOP_RESOURCE_ID"),
    whopCompanyId: readEnv("WHOP_COMPANY_ID") || readEnv("WHOP_BUSINESS_ID"),
    whopPlanId: readEnv("WHOP_PLAN_ID"),
    whopApiKey,
    mockMode,
    allowFreeAccess: readBoolean("WHOP_ALLOW_FREE_ACCESS", false),
    billingPortalFallbackUrl: readEnv(
      "WHOP_BILLING_PORTAL_FALLBACK_URL",
      "https://whop.com/@me/settings/memberships/"
    )
  };
}

export function getCheckoutUrl() {
  const env = getServerEnv();
  if (!env.whopPlanId) {
    return `${env.publicAppUrl}/checkout`;
  }

  return `https://whop.com/checkout/${env.whopPlanId}`;
}
