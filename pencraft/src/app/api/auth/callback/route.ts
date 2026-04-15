import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getWhopBaseUrl } from "@/lib/whop";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?error=oauth_denied", env.NEXT_PUBLIC_APP_URL));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("pkce_verifier")?.value;

  cookieStore.delete("oauth_state");
  cookieStore.delete("pkce_verifier");

  if (!code || !state || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", env.NEXT_PUBLIC_APP_URL));
  }

  const baseUrl = getWhopBaseUrl();

  const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
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

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL("/?error=token_exchange_failed", env.NEXT_PUBLIC_APP_URL)
    );
  }

  const tokens = await tokenResponse.json();

  const userInfoResponse = await fetch(`${baseUrl}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    return NextResponse.redirect(
      new URL("/?error=userinfo_failed", env.NEXT_PUBLIC_APP_URL)
    );
  }

  const userInfo = await userInfoResponse.json();

  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    update: {
      email: userInfo.email ?? "",
      name: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email ?? "",
      name: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.redirect(new URL("/studio", env.NEXT_PUBLIC_APP_URL));
}
