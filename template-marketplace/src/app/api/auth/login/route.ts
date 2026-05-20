import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { appUrl, whopOauthBaseUrl } from "@/lib/whop";

const VERIFIER_COOKIE = "stax_pkce_verifier";
const STATE_COOKIE = "stax_oauth_state";
const REDIRECT_COOKIE = "stax_oauth_redirect";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Only accept same-origin paths like "/sell" — never absolute URLs or
// protocol-relative URLs ("//evil.com") that could redirect off-site.
function safeRedirectTarget(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export async function GET(request: NextRequest) {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(
    createHash("sha256").update(verifier).digest(),
  );
  const state = base64url(randomBytes(16));
  const nonce = base64url(randomBytes(16));

  const params = new URLSearchParams({
    client_id: process.env.WHOP_CLIENT_ID!,
    redirect_uri: `${appUrl}/api/auth/callback`,
    response_type: "code",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(
    `${whopOauthBaseUrl}/oauth/authorize?${params.toString()}`,
  );

  response.cookies.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const redirectTo = safeRedirectTarget(
    new URL(request.url).searchParams.get("redirect_to"),
  );
  if (redirectTo) {
    response.cookies.set(REDIRECT_COOKIE, redirectTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
  }

  return response;
}
