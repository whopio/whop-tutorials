import "server-only";
import Whop from "@whop/sdk";
import { env, isSandbox } from "./env";

// Sandbox override: capital "URL" AND the required /api/v1 suffix. `baseUrl`
// (lowercase) is silently ignored and every call hits production → 401.
const sandboxOverride = isSandbox()
  ? { baseURL: "https://sandbox-api.whop.com/api/v1" }
  : {};

/**
 * Company-key client — products, plans, checkout configurations, connected
 * accounts, payouts. Uses the platform Company API Key (`access_pass:create`
 * scope). The App API Key + webhook client is added when we wire webhooks.
 */
export const whopCompany = new Whop({
  apiKey: env.WHOP_COMPANY_API_KEY,
  ...sandboxOverride,
});

/**
 * App-key client — used to verify inbound webhooks. `webhookKey` must be the
 * base64 of WHOP_WEBHOOK_SECRET (a trailing newline in the secret fails
 * verification silently with 401).
 */
export const whopsdk = new Whop({
  apiKey: env.WHOP_CLIENT_SECRET,
  appID: env.WHOP_CLIENT_ID,
  webhookKey: Buffer.from(env.WHOP_WEBHOOK_SECRET ?? "").toString("base64"),
  ...sandboxOverride,
});

