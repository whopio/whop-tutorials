import "server-only";
import { env } from "./env";

/**
 * Whop OAuth 2.1 + PKCE. Per the Whop docs, OAuth endpoints live at
 * https://api.whop.com/oauth/ for BOTH sandbox and production apps (the
 * sandbox flag only changes the SDK data-API base, not OAuth). Override with
 * WHOP_OAUTH_BASE_URL only if a sandbox test proves it needs a different host.
 *
 * All four gotchas are encoded below:
 *  - `nonce` is sent because we request the `openid` scope.
 *  - `client_secret` is sent in the token exchange even though we use PKCE
 *    (confidential server client — Whop returns 401 invalid_client without it).
 *  - the token body is JSON, not form-urlencoded.
 *  - `redirect_uri` is the exact registered callback.
 */
const OAUTH_BASE = (
  process.env.WHOP_OAUTH_BASE_URL ?? "https://api.whop.com"
).replace(/\/$/, "");

export const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
export const OAUTH_SCOPE = "openid profile email";

export function buildAuthorizeUrl(params: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(`${OAUTH_BASE}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: env.WHOP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: OAUTH_SCOPE,
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
};

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH_BASE}/oauth/token`, {
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
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

type UserInfo = {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  picture?: string;
};

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const res = await fetch(`${OAUTH_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as UserInfo;
}
