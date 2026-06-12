import crypto from "crypto";
import { env, whopOAuthBaseUrl } from "./env";

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/oauth/callback`;
const SCOPE = "openid profile email";

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function randomString(bytes = 32): string {
  return base64url(crypto.randomBytes(bytes));
}

export function codeChallengeS256(verifier: string): string {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

export interface PkceState {
  verifier: string;
  state: string;
  nonce: string;
  returnTo?: string;
}

export function buildAuthorizeUrl(pkce: PkceState): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.WHOP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state: pkce.state,
    nonce: pkce.nonce,
    code_challenge: codeChallengeS256(pkce.verifier),
    code_challenge_method: "S256",
  });
  return `${whopOAuthBaseUrl()}/oauth/authorize?${params.toString()}`;
}

export interface WhopTokens {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<WhopTokens> {
  const res = await fetch(`${whopOAuthBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as WhopTokens;
}

export interface WhopUserInfo {
  sub: string;
  preferred_username?: string;
  name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

export async function getUserInfo(accessToken: string): Promise<WhopUserInfo> {
  const res = await fetch(`${whopOAuthBaseUrl()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch userinfo (${res.status})`);
  }
  return (await res.json()) as WhopUserInfo;
}
