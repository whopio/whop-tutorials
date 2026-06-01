import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { whopOauthBaseUrl, randomString, sha256 } from "@/lib/whop-oauth";

export async function GET(req: NextRequest) {
  const verifier = randomString(32);
  const challenge = await sha256(verifier);
  const state = randomString(16);
  const nonce = randomString(16);

  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/";

  const c = await cookies();
  c.set("storyline_pkce_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  c.set("storyline_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  c.set("storyline_oauth_return_to", returnTo, {
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
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`${whopOauthBaseUrl}/oauth/authorize?${params}`);
}
