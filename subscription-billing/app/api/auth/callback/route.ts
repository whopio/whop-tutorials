import { NextResponse, type NextRequest } from "next/server";
import { clearPkceCookie, readPkceCookie } from "@/lib/pkce-cookie";
import { exchangeCode, fetchUserInfo } from "@/lib/whop-oauth";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(`${getEnv().APP_URL}${path}`);
}

function idTokenNonce(idToken: string): string | undefined {
  const payload: unknown = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString());
  return payload && typeof payload === "object" && "nonce" in payload && typeof payload.nonce === "string"
    ? payload.nonce
    : undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  if (request.nextUrl.searchParams.get("error") || !code || !returnedState) {
    return redirectTo("/?error=signin_cancelled");
  }

  const pkce = await readPkceCookie();
  if (!pkce || pkce.state !== returnedState) {
    return redirectTo("/?error=state_mismatch");
  }

  try {
    const tokens = await exchangeCode(code, pkce.codeVerifier);
    if (tokens.id_token && idTokenNonce(tokens.id_token) !== pkce.nonce) {
      throw new Error("id_token nonce mismatch");
    }

    const user = await fetchUserInfo(tokens.access_token);
    if (!user.email) {
      return redirectTo("/?error=email_required");
    }

    const session = await getSession();
    session.whopUserId = user.sub;
    session.email = user.email;
    await session.save();

    await clearPkceCookie();
    return redirectTo("/");
  } catch (error: unknown) {
    console.error("[oauth] callback failed", error);
    return redirectTo("/?error=signin_failed");
  }
}
