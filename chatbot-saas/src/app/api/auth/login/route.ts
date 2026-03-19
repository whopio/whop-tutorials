import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH, generatePKCE } from "@/lib/whop";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const limited = rateLimit(`auth:login:${ip}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  const { verifier, challenge } = await generatePKCE();

  // Generate nonce for OIDC (required by Whop's authorize endpoint)
  const nonceArray = new Uint8Array(16);
  crypto.getRandomValues(nonceArray);
  const nonce = Array.from(nonceArray, (b) => b.toString(16).padStart(2, "0")).join("");

  // Generate state for CSRF protection
  const stateArray = new Uint8Array(16);
  crypto.getRandomValues(stateArray);
  const state = Array.from(stateArray, (b) => b.toString(16).padStart(2, "0")).join("");

  const session = await getSession();
  session.codeVerifier = verifier;
  session.oauthState = state;
  await session.save();

  const params = new URLSearchParams({
    client_id: WHOP_OAUTH.clientId,
    redirect_uri: WHOP_OAUTH.redirectUri,
    response_type: "code",
    scope: WHOP_OAUTH.scopes.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  return NextResponse.redirect(
    `${WHOP_OAUTH.authorizationUrl}?${params.toString()}`
  );
}
