import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getWhopBaseUrl } from "@/lib/whop";

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function randomString(len: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(len)));
}

async function sha256(str: string): Promise<string> {
  return base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
    )
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || "/studio";

  const codeVerifier = randomString(32);
  const codeChallenge = await sha256(codeVerifier);
  const state = randomString(16);
  const nonce = randomString(16);

  const cookieStore = await cookies();
  cookieStore.set("pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("oauth_redirect", redirectTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.WHOP_CLIENT_ID,
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const baseUrl = getWhopBaseUrl();
  return NextResponse.redirect(`${baseUrl}/oauth/authorize?${params}`);
}
