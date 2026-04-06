import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH_BASE } from "@/lib/whop";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const storedState = request.cookies.get("oauth_state")?.value;
  const codeVerifier = request.cookies.get("oauth_code_verifier")?.value;

  if (!code || !state || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/sign-in?error=invalid_state`
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch(`${WHOP_OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/sign-in?error=token_exchange`
    );
  }

  const tokens = await tokenRes.json();

  // Fetch user info
  const userInfoRes = await fetch(`${WHOP_OAUTH_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/sign-in?error=userinfo`
    );
  }

  const userInfo = await userInfoRes.json();

  // Upsert user in database
  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    update: {
      email: userInfo.email,
      name: userInfo.name || userInfo.preferred_username,
      avatar: userInfo.picture,
    },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.preferred_username,
      avatar: userInfo.picture,
    },
  });

  // Create session
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = tokens.access_token;
  await session.save();

  const response = NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/dashboard`
  );

  // Clear OAuth cookies
  response.cookies.delete("oauth_code_verifier");
  response.cookies.delete("oauth_state");

  return response;
}
