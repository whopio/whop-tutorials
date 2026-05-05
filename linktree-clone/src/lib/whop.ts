import Whop from "@whop/sdk";

// Whop platform-level client.
//
// Used for:
//   - Creating connected-account companies under our parent company
//   - Generating account links for KYC onboarding
//   - Creating checkout configurations
//   - Verifying webhook signatures
//   - Minting access tokens for the embedded payout portal
//
// The webhook secret must be base64-encoded before being handed to the SDK,
// because Whop's internal `standardwebhooks` library base64-decodes it back
// to derive the HMAC key. Skipping this step makes signature verification
// silently fail on every webhook delivery.
const globalForWhop = globalThis as unknown as { whop: Whop };

export const whop =
  globalForWhop.whop ??
  new Whop({
    apiKey: process.env.WHOP_API_KEY!,
    appID: process.env.WHOP_APP_ID,
    webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET ?? "").toString(
      "base64"
    ),
  });

if (process.env.NODE_ENV !== "production") globalForWhop.whop = whop;

// Short-lived user-scoped client for calls made on behalf of a specific user
// using their OAuth access token.
export function whopAsUser(oauthToken: string): Whop {
  return new Whop({ apiKey: `Bearer ${oauthToken}` });
}
