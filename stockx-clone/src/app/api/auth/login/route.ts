import { NextResponse } from "next/server";
import { env } from "@/lib/env";

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET() {
  const codeVerifierBytes = new Uint8Array(32);
  crypto.getRandomValues(codeVerifierBytes);
  const codeVerifier = base64url(codeVerifierBytes.buffer);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = base64url(digest);

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  const authUrl = new URL(`${env.WHOP_API_BASE}/oauth/authorize`);
  authUrl.searchParams.set("client_id", env.WHOP_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);

  const cookieValue = JSON.stringify({ codeVerifier, state });

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("oauth_pkce", cookieValue, {
    httpOnly: true,
    secure: env.NEXT_PUBLIC_APP_URL.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
