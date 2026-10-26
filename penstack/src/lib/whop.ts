import { WhopClient, WhopEnvironment } from "@whop/sdk";

let _whop: WhopClient | null = null;
export function getWhop(): WhopClient {
  if (!_whop) {
    _whop = new WhopClient({
      token: process.env.WHOP_API_KEY!,
      environment:
        process.env.WHOP_SANDBOX === "true"
          ? WhopEnvironment.Sandbox
          : WhopEnvironment.Production,
    });
  }
  return _whop;
}

export const whop = new Proxy({} as WhopClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getWhop(), prop, receiver);
  },
});

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
  ],
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
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
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
