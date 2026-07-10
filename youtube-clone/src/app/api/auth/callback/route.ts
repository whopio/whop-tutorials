import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchUserInfo } from "@/lib/whop-oauth";
import { safeNext } from "../login/route";
import { writeSessionCookie } from "@/lib/session";
import { PKCE_COOKIE } from "@/lib/session-config";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/sign-in?error=${reason}`, origin));

  if (oauthError) return fail(oauthError);
  if (!code || !state) return fail("missing_code");

  const pkceRaw = request.cookies.get(PKCE_COOKIE)?.value;
  if (!pkceRaw) return fail("missing_pkce");

  let pkce: { verifier: string; state: string; nonce: string; next?: string };
  try {
    pkce = JSON.parse(pkceRaw);
  } catch {
    return fail("bad_pkce");
  }
  if (pkce.state !== state) return fail("state_mismatch");

  try {
    const tokens = await exchangeCodeForTokens(code, pkce.verifier);
    const info = await fetchUserInfo(tokens.access_token);

    // AUTH-6: upsert the Whop user into our DB, keyed by their Whop user id.
    const profile = {
      username: info.preferred_username ?? info.sub,
      name: info.name ?? null,
      email: info.email ?? null,
      avatarUrl: info.picture ?? null,
    };
    const user = await prisma.user.upsert({
      where: { whopUserId: info.sub },
      create: { whopUserId: info.sub, ...profile },
      update: profile,
    });

    const res = NextResponse.redirect(new URL(safeNext(pkce.next) ?? "/", origin));
    await writeSessionCookie(res, {
      user: {
        id: user.id,
        whopUserId: user.whopUserId,
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      accessToken: tokens.access_token,
    });
    res.cookies.delete(PKCE_COOKIE);
    return res;
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return fail("token_exchange_failed");
  }
}
