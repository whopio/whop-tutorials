import { z } from "zod";
import { getEnv } from "@/lib/env";

function oauthHost(): string {
  return getEnv().WHOP_SANDBOX ? "https://sandbox-api.whop.com" : "https://api.whop.com";
}

function oauthClient(): { clientId: string; clientSecret: string; redirectUri: string } {
  const env = getEnv();
  if (!env.WHOP_CLIENT_ID || !env.WHOP_CLIENT_SECRET) {
    throw new Error("WHOP_CLIENT_ID and WHOP_CLIENT_SECRET are required for sign in");
  }
  return {
    clientId: env.WHOP_CLIENT_ID,
    clientSecret: env.WHOP_CLIENT_SECRET,
    redirectUri: `${env.APP_URL}/api/auth/callback`,
  };
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  id_token: z.string().optional(),
});

const userInfoSchema = z.object({
  sub: z.string(),
  name: z.string().nullish(),
  preferred_username: z.string().nullish(),
  email: z.string().nullish(),
});

export type WhopUserInfo = z.infer<typeof userInfoSchema>;

export interface PkceState {
  codeVerifier: string;
  state: string;
  nonce: string;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function randomString(length: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(length)));
}

async function sha256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export async function buildAuthorizeUrl(pkce: PkceState): Promise<string> {
  const { clientId, redirectUri } = oauthClient();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state: pkce.state,
    nonce: pkce.nonce,
    code_challenge: await sha256Challenge(pkce.codeVerifier),
    code_challenge_method: "S256",
  });
  return `${oauthHost()}/oauth/authorize?${params.toString()}`;
}

// The token endpoint wants a JSON body and the client secret, even with PKCE.
export async function exchangeCode(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = oauthClient();
  const response = await fetch(`${oauthHost()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier,
    }),
  });
  if (!response.ok) {
    throw new Error(`Token exchange failed with ${response.status}`);
  }
  return tokenResponseSchema.parse(await response.json());
}

export async function fetchUserInfo(accessToken: string): Promise<WhopUserInfo> {
  const response = await fetch(`${oauthHost()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Userinfo failed with ${response.status}`);
  }
  return userInfoSchema.parse(await response.json());
}
