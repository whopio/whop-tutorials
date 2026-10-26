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

let _companyWhop: WhopClient | null = null;
export function getCompanyWhop(): WhopClient {
  if (!_companyWhop) {
    _companyWhop = new WhopClient({
      token: process.env.WHOP_COMPANY_API_KEY!,
      environment:
        process.env.WHOP_SANDBOX === "true"
          ? WhopEnvironment.Sandbox
          : WhopEnvironment.Production,
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
