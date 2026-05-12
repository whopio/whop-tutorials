import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function base64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64url(crypto.randomBytes(16));
  const nonce = base64url(crypto.randomBytes(16));

  const cookieStore = await cookies();
  cookieStore.set("pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.WHOP_CLIENT_ID as string,
    redirect_uri: process.env.WHOP_REDIRECT_URI as string,
    response_type: "code",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${process.env.WHOP_OAUTH_BASE}/oauth/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
