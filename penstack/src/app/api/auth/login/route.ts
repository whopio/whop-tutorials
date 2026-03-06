import { NextRequest, NextResponse } from "next/server";
import { WHOP_OAUTH, generatePKCE } from "@/lib/whop";

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  // Validate returnTo is a safe relative path (prevents open redirect)
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : null;

  const { verifier, challenge } = await generatePKCE();
  const state = randomHex(16);
  const nonce = randomHex(16);

  const authUrl = new URL(WHOP_OAUTH.authorizationUrl);
  authUrl.searchParams.set("client_id", WHOP_OAUTH.clientId);
  authUrl.searchParams.set("redirect_uri", WHOP_OAUTH.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", WHOP_OAUTH.scopes.join(" "));
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);

  // Store PKCE data in a raw cookie on the redirect response.
  // iron-session + NextResponse.redirect() can lose cookies — the Done
  // articles all use this pattern instead.
  const cookieValue = JSON.stringify({
    codeVerifier: verifier,
    state,
    ...(safeReturnTo ? { returnTo: safeReturnTo } : {}),
  });

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("oauth_pkce", cookieValue, {
    httpOnly: true,
    secure: WHOP_OAUTH.redirectUri.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
