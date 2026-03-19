import Whop from "@whop/sdk";

// Lazy initialization — the Whop SDK throws if env vars are missing,
// so we defer construction to runtime (not build time).
let _whop: Whop | null = null;
export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      appID: process.env.WHOP_APP_ID!,
      apiKey: process.env.WHOP_API_KEY!,
      webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString("base64"),
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _whop;
}

// Company API key client — used for operations that need higher permissions
// (product/plan creation) which app API keys don't support.
let _companyWhop: Whop | null = null;
export function getCompanyWhop(): Whop {
  if (!_companyWhop) {
    _companyWhop = new Whop({
      apiKey: process.env.WHOP_COMPANY_API_KEY!,
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _companyWhop;
}

const isSandbox = () => process.env.WHOP_SANDBOX === "true";
const whopDomain = () => (isSandbox() ? "sandbox.whop.com" : "whop.com");
const whopApiDomain = () =>
  isSandbox() ? "sandbox-api.whop.com" : "api.whop.com";

export const WHOP_OAUTH = {
  get authorizationUrl() {
    return `https://${whopApiDomain()}/oauth/authorize`;
  },
  get tokenUrl() {
    return `https://${whopApiDomain()}/oauth/token`;
  },
  get userInfoUrl() {
    return `https://${whopApiDomain()}/oauth/userinfo`;
  },
  get clientId() {
    return process.env.WHOP_CLIENT_ID!;
  },
  get clientSecret() {
    return process.env.WHOP_CLIENT_SECRET!;
  },
  scopes: ["openid", "profile", "email"],
  get redirectUri() {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  },
};

/**
 * Generate PKCE code verifier and challenge using Web Crypto API
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
