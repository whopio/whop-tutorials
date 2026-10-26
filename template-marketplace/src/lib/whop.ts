import { WhopClient, WhopEnvironment } from "@whop/sdk";

const isSandbox = process.env.WHOP_SANDBOX?.trim() === "true";

// SDK 2.x reads no env vars by itself, so the sandbox switch has to be
// passed explicitly. Without it every call goes to production and a
// sandbox key gets a 401.
const environment = isSandbox
  ? WhopEnvironment.Sandbox
  : WhopEnvironment.Production;

// Defensive trim on every Whop credential. Vercel's UI silently keeps
// leading/trailing whitespace on paste, which 401s every API call with no
// helpful error.
const appKey = (process.env.WHOP_API_KEY ?? "").trim();
const companyKey = (process.env.WHOP_COMPANY_API_KEY ?? "").trim();
// The raw ws_ secret. unwrapWebhook from @whop/sdk/helpers base64-encodes
// it internally, so we never encode it ourselves.
export const webhookSecret = (process.env.WHOP_WEBHOOK_SECRET ?? "").trim();

/**
 * App-key client. Uses WHOP_API_KEY (the App API Key from Developer > Apps).
 * Sign-in runs on raw OAuth fetches against whopOauthBaseUrl, and webhooks
 * are verified with webhookSecret, so nothing calls this client today.
 */
export const whopApp = new WhopClient({
  token: appKey,
  environment,
});

/**
 * Company-key client, used for operations that need the parent platform
 * account's permissions: accounts.create, accountLinks.create,
 * products.create, checkoutConfigurations.create and promoCodes.*. Uses
 * WHOP_COMPANY_API_KEY (the Company API Key from Business Settings >
 * API Keys), which has the access_pass:create scope the App API Key lacks.
 */
export const whopCompany = new WhopClient({
  token: companyKey,
  environment,
});

export const whopOauthBaseUrl = isSandbox
  ? "https://sandbox-api.whop.com"
  : "https://api.whop.com";

// Trim defends against whitespace pasted into Vercel env-var UI.
export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
