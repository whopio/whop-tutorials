import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl, whopOauthBaseUrl } from "@/lib/whop";

const VERIFIER_COOKIE = "stax_pkce_verifier";
const STATE_COOKIE = "stax_oauth_state";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UserInfo {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  email?: string;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !verifier || !state || state !== expectedState) {
    return NextResponse.redirect(
      `${appUrl}/sign-in?error=invalid_state`,
    );
  }

  const tokenRes = await fetch(`${whopOauthBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${appUrl}/api/auth/callback`,
      client_id: process.env.WHOP_CLIENT_ID!,
      client_secret: process.env.WHOP_CLIENT_SECRET!,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("Token exchange failed", tokenRes.status, body);
    const detail = encodeURIComponent(`${tokenRes.status}:${body.slice(0, 500)}`);
    return NextResponse.redirect(
      `${appUrl}/sign-in?error=token_exchange&detail=${detail}`,
    );
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  const userInfoRes = await fetch(`${whopOauthBaseUrl}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    console.error("Userinfo fetch failed", await userInfoRes.text());
    return NextResponse.redirect(
      `${appUrl}/sign-in?error=userinfo`,
    );
  }

  const userInfo = (await userInfoRes.json()) as UserInfo;

  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email ?? `${userInfo.sub}@unknown.whop`,
      name: userInfo.name ?? userInfo.preferred_username ?? null,
      avatar: userInfo.picture ?? null,
    },
    update: {
      email: userInfo.email ?? undefined,
      name: userInfo.name ?? userInfo.preferred_username ?? undefined,
      avatar: userInfo.picture ?? undefined,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = tokens.access_token;
  await session.save();

  const response = NextResponse.redirect(`${appUrl}/`);
  response.cookies.delete(VERIFIER_COOKIE);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
