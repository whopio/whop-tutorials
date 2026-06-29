export type AccessLevel = "no_access" | "customer" | "admin";
export type EntitlementTier = "free" | "premium" | "admin";

export type EntitlementSnapshot = {
  hasAccess: boolean;
  accessLevel: AccessLevel;
  tier: EntitlementTier;
  source: "mock" | "whop-api-key" | "whop-user-token";
  checkedAt: string;
  expiresAt: string;
  checkoutUrl: string;
  billingPortalUrl?: string;
  features: string[];
  user?: {
    id: string;
    name?: string;
    username?: string;
    email?: string;
    picture?: string;
  };
};
