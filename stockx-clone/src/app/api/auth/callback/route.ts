import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { type SessionData, sessionOptions } from "@/lib/auth";
import { env } from "@/lib/env";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface UserInfoResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?error=missing_params`
    );
  }

  const pkceCookie = request.cookies.get("oauth_pkce");
  if (!pkceCookie?.value) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?error=missing_pkce`
    );
  }

  let storedState: string;
  let codeVerifier: string;
  try {
    const parsed = JSON.parse(pkceCookie.value) as {
      state: string;
      codeVerifier: string;
    };
    storedState = parsed.state;
    codeVerifier = parsed.codeVerifier;
  } catch {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?error=invalid_pkce`
    );
  }

  if (state !== storedState) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?error=state_mismatch`
    );
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  const tokenRes = await fetch(`${env.WHOP_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => "no body");
    console.error("Token exchange failed:", tokenRes.status, errBody);
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?error=token_exchange_failed&status=${tokenRes.status}&detail=${encodeURIComponent(errBody.slice(0, 200))}`
    );
  }

  const tokenData = (await tokenRes.json()) as TokenResponse;

  const userInfoRes = await fetch(`${env.WHOP_API_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    const errBody = await userInfoRes.text().catch(() => "no body");
    console.error("Userinfo failed:", userInfoRes.status, errBody);
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?error=userinfo_failed&status=${userInfoRes.status}&detail=${encodeURIComponent(errBody.slice(0, 200))}`
    );
  }

  const userInfo = (await userInfoRes.json()) as UserInfoResponse;

  const user = await prisma.user.upsert({
    where: { whopId: userInfo.sub },
    update: {
      email: userInfo.email ?? undefined,
      username: userInfo.preferred_username ?? undefined,
      displayName: userInfo.name ?? undefined,
      avatarUrl: userInfo.picture ?? undefined,
      whopAccessToken: tokenData.access_token,
      whopRefreshToken: tokenData.refresh_token,
    },
    create: {
      whopId: userInfo.sub,
      email: userInfo.email ?? "",
      username: userInfo.preferred_username ?? userInfo.sub,
      displayName: userInfo.name,
      avatarUrl: userInfo.picture,
      whopAccessToken: tokenData.access_token,
      whopRefreshToken: tokenData.refresh_token,
    },
  });

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  session.userId = user.id;
  session.whopId = user.whopId;
  session.accessToken = tokenData.access_token;
  await session.save();

  const response = NextResponse.redirect(env.NEXT_PUBLIC_APP_URL);
  response.cookies.delete("oauth_pkce");
  return response;
}
