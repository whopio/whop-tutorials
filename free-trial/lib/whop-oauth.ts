// Demo-only: the minimal slice of Whop OAuth (PKCE) needed to restore
// access on a new device. The full flow is explained line by line in the
// "How to add user authentication" article; this file keeps only
// authorize, token exchange, and userinfo. Tokens are discarded after we
// learn who the user is.
import { z } from "zod";
import { getEnv } from "@/lib/env";

const oauthEnvSchema = z.object({
  WHOP_CLIENT_ID: z.string().startsWith("app_"),
  WHOP_CLIENT_SECRET: z.string().min(1),
});

type OAuthEnv = z.infer<typeof oauthEnvSchema>;

let cachedOAuthEnv: OAuthEnv | null = null;

function getOAuthEnv(): OAuthEnv {
  if (cachedOAuthEnv) return cachedOAuthEnv;
  cachedOAuthEnv = oauthEnvSchema.parse({
    WHOP_CLIENT_ID: process.env.WHOP_CLIENT_ID?.trim(),
    WHOP_CLIENT_SECRET: process.env.WHOP_CLIENT_SECRET?.trim(),
  });
  return cachedOAuthEnv;
}

function getBaseUrl(): string {
  return getEnv().WHOP_SANDBOX
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  id_token: z.string().optional(),
});

const userInfoSchema = z.object({
  sub: z.string(),
  preferred_username: z.string().optional(),
});

export type WhopUserInfo = z.infer<typeof userInfoSchema>;

export interface PkceState {
  codeVerifier: string;
  state: string;
  nonce: string;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function randomString(length: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(length)));
}

async function sha256Challenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}

export async function buildAuthorizeUrl(pkce: PkceState): Promise<string> {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getOAuthEnv().WHOP_CLIENT_ID,
    redirect_uri: `${getEnv().APP_URL}/api/auth/callback`,
    scope: "openid profile",
    state: pkce.state,
    // Whop requires a nonce whenever the scope includes "openid".
    nonce: pkce.nonce,
    code_challenge: await sha256Challenge(pkce.codeVerifier),
    code_challenge_method: "S256",
  });
  return `${getBaseUrl()}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<z.infer<typeof tokenResponseSchema>> {
  const response = await fetch(`${getBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${getEnv().APP_URL}/api/auth/callback`,
      client_id: getOAuthEnv().WHOP_CLIENT_ID,
      // Whop's token endpoint requires the client secret even with PKCE.
      client_secret: getOAuthEnv().WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const err: unknown = await response.json().catch(() => ({}));
    throw new Error(
      `Token exchange failed (${response.status}): ${JSON.stringify(err)}`,
    );
  }

  return tokenResponseSchema.parse(await response.json());
}

export async function fetchUserInfo(
  accessToken: string,
): Promise<WhopUserInfo> {
  const response = await fetch(`${getBaseUrl()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Userinfo failed (${response.status})`);
  }
  return userInfoSchema.parse(await response.json());
}
