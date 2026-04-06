import { NextResponse } from "next/server";
import { WHOP_OAUTH_BASE } from "@/lib/whop";
import { env } from "@/lib/env";

export async function GET() {
  const clientId = env.WHOP_CLIENT_ID;
  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
  });

  const authUrl = `${WHOP_OAUTH_BASE}/oauth/authorize?${params}`;

  const response = NextResponse.redirect(authUrl);

  // Store PKCE verifier and state in cookies for the callback
  response.cookies.set("oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
