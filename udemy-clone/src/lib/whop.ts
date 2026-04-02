import Whop from "@whop/sdk";

let _whop: Whop | null = null;

export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      apiKey: process.env.WHOP_API_KEY!,
      webhookKey: process.env.WHOP_WEBHOOK_SECRET
        ? Buffer.from(process.env.WHOP_WEBHOOK_SECRET).toString("base64")
        : undefined,
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _whop;
}

const isSandbox = () => process.env.WHOP_SANDBOX === "true";
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
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
