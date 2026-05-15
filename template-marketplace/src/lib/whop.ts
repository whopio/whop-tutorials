import Whop from "@whop/sdk";

const isSandbox = process.env.WHOP_SANDBOX?.trim() === "true";

// SDK option is `baseURL` (capital URL) and must include the `/api/v1`
// path, without those two the SDK silently falls back to production.
const baseURL = isSandbox ? "https://sandbox-api.whop.com/api/v1" : undefined;

// Defensive trim on every Whop credential, Vercel's UI silently keeps
// leading/trailing whitespace on paste, which 401s every API call with no
// helpful error.
const appKey = (process.env.WHOP_API_KEY ?? "").trim();
const companyKey = (process.env.WHOP_COMPANY_API_KEY ?? "").trim();
const webhookSecret = (process.env.WHOP_WEBHOOK_SECRET ?? "").trim();
// SDK expects the webhook secret base64-encoded for signature verification.
const webhookKey = webhookSecret
  ? Buffer.from(webhookSecret, "utf-8").toString("base64")
  : undefined;

/**
 * App-key client, used for OAuth flows, webhook signature verification,
 * companies.create, and accountLinks.create. Uses WHOP_API_KEY (the App
 * API Key from Developer → Apps).
 */
export const whopApp = new Whop({
  apiKey: appKey,
  ...(webhookKey && { webhookKey }),
  ...(baseURL && { baseURL }),
});

/**
 * Company-key client, used for operations that need the parent platform
 * Company's permissions: products.create, plans.create,
 * checkoutConfigurations.create, promoCodes.* (Part 3 onward). Uses
 * WHOP_COMPANY_API_KEY (the Company API Key from Business Settings →
 * API Keys), which has the access_pass:create scope the App API Key lacks.
 */
export const whopCompany = new Whop({
  apiKey: companyKey,
  ...(baseURL && { baseURL }),
});

export const whopOauthBaseUrl = isSandbox
  ? "https://sandbox-api.whop.com"
  : "https://api.whop.com";

// Trim defends against whitespace pasted into Vercel env-var UI.
export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
