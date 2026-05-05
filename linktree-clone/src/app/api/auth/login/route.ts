import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";

const HANDLE_PATTERN = /^[a-z0-9_-]{2,32}$/;

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(req: NextRequest) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.WHOP_CLIENT_ID!,
    redirect_uri: process.env.WHOP_REDIRECT_URI!,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const whopBase = process.env.WHOP_OAUTH_BASE ?? "https://api.whop.com";
  const authorizeUrl = `${whopBase}/oauth/authorize?${params.toString()}`;

  const res = NextResponse.redirect(authorizeUrl);

  // Cookies survive a cross-site redirect (whop.com -> our domain) only when
  // both Secure and SameSite=Lax are set. Without Secure, modern browsers drop
  // the cookie during the return leg and the callback sees no verifier.
  const isProd = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("pkce_verifier", codeVerifier, cookieOpts);
  res.cookies.set("oauth_state", state, cookieOpts);

  // Optional: a handle hint passed in from the homepage CTA. We don't trust
  // it, we just round-trip it as a non-httpOnly cookie so the dashboard can
  // pre-fill the handle input after the user comes back from OAuth.
  const handleHint = req.nextUrl.searchParams.get("handle");
  if (handleHint && HANDLE_PATTERN.test(handleHint)) {
    res.cookies.set("intended_handle", handleHint, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  return res;
}
