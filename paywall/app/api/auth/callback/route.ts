import { NextResponse, type NextRequest } from "next/server";
import { clearPkceCookie, readPkceCookie } from "@/lib/pkce-cookie";
import { exchangeCodeForTokens, fetchUserInfo } from "@/lib/whop-oauth";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(`${getEnv().APP_URL}${path}`);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error(
      "[oauth] callback error:",
      error,
      url.searchParams.get("error_description"),
    );
    return redirectTo(`/?error=${encodeURIComponent(error)}`);
  }

  if (!code || !returnedState) {
    return redirectTo("/?error=missing_params");
  }

  const pkce = await readPkceCookie();
  if (!pkce || pkce.state !== returnedState) {
    return redirectTo("/?error=state_mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens(code, pkce.codeVerifier);

    if (tokens.id_token) {
      const payload: unknown = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64url").toString(),
      );
      if (
        !payload ||
        typeof payload !== "object" ||
        (payload as { nonce?: string }).nonce !== pkce.nonce
      ) {
        throw new Error("id_token nonce mismatch");
      }
    }

    // The OAuth `sub` claim is the same user id a payment carries, so the
    // paywall gate works identically however the id reached the session.
    const user = await fetchUserInfo(tokens.access_token);

    const session = await getSession();
    session.whopUserId = user.sub;
    session.username = user.preferred_username;
    session.unlockedAt = Date.now();
    await session.save();

    await clearPkceCookie();
    return redirectTo("/?restored=1");
  } catch (err) {
    console.error("[oauth] callback failed:", err);
    return redirectTo("/?error=oauth_failed");
  }
}
