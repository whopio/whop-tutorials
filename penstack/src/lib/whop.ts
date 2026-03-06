import Whop from "@whop/sdk";

// Lazy initialization — the Whop SDK throws if env vars are missing,
// so we defer construction to runtime (not build time).
let _whop: Whop | null = null;
export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      appID: process.env.WHOP_APP_ID!,
      apiKey: process.env.WHOP_API_KEY!,
      webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET!),
      // Route SDK calls to sandbox API when developing locally
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _whop;
}

/** @deprecated Use getWhop() instead — kept for import convenience */
export const whop = new Proxy({} as Whop, {
  get(_target, prop, receiver) {
    return Reflect.get(getWhop(), prop, receiver);
  },
});

/**
 * OAuth configuration for Whop OAuth 2.1 + PKCE
 * Uses sandbox URLs when WHOP_SANDBOX=true for development.
 */
const isSandbox = process.env.WHOP_SANDBOX === "true";
const whopDomain = isSandbox ? "sandbox.whop.com" : "whop.com";
const whopApiDomain = isSandbox ? "sandbox-api.whop.com" : "api.whop.com";

export const WHOP_OAUTH = {
  authorizationUrl: `https://${whopApiDomain}/oauth/authorize`,
  tokenUrl: `https://${whopApiDomain}/oauth/token`,
  userInfoUrl: `https://${whopApiDomain}/oauth/userinfo`,
  clientId: process.env.WHOP_CLIENT_ID!,
  clientSecret: process.env.WHOP_CLIENT_SECRET!,
  scopes: [
    "openid",
    "profile",
    "email",
    "chat:message:create",
    "chat:read",
    "dms:read",
    "dms:message:manage",
    "dms:channel:manage",
  ],
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
};

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = base64UrlEncode(array);

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64UrlEncode(new Uint8Array(digest));

  return { verifier, challenge };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
