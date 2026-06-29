export type RuntimeConfig = {
  apiBaseUrl: string;
  checkoutUrl: string;
  whopClientId: string;
  whopResourceId: string;
  oauthScope: string;
  mockMode: boolean;
};

export type WhopTokens = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  obtained_at: number;
};

export type ExtensionUser = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  picture?: string;
};

export type EntitlementSnapshot = {
  hasAccess: boolean;
  accessLevel: "no_access" | "customer" | "admin";
  tier: "free" | "premium" | "admin";
  source: "mock" | "whop-api-key" | "whop-user-token";
  checkedAt: string;
  expiresAt: string;
  checkoutUrl: string;
  billingPortalUrl?: string;
  features: string[];
  user?: ExtensionUser;
  error?: string;
};

export type ExtensionState = {
  signedIn: boolean;
  user?: ExtensionUser;
  entitlement?: EntitlementSnapshot;
  config: RuntimeConfig;
};

export type RuntimeMessage =
  | { type: "GET_STATE" }
  | { type: "SIGN_IN"; mockTier?: "free" | "premium" | "admin" }
  | { type: "LOG_OUT" }
  | { type: "REFRESH_ENTITLEMENT" }
  | { type: "GET_BILLING_PORTAL" }
  | { type: "GET_GATED_RESOURCE" };
