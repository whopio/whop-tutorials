import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing authorization code or state" },
      { status: 400 }
    );
  }

  // Retrieve PKCE data from the raw cookie set during login
  const pkceCookie = request.cookies.get("oauth_pkce");
  if (!pkceCookie?.value) {
    return NextResponse.json(
      { error: "Missing PKCE cookie. Please try logging in again." },
      { status: 400 }
    );
  }

  let storedState: string;
  let codeVerifier: string;
  let returnTo: string | undefined;
  try {
    const parsed = JSON.parse(pkceCookie.value);
    storedState = parsed.state;
    codeVerifier = parsed.codeVerifier;
    returnTo = parsed.returnTo;
  } catch {
    return NextResponse.json(
      { error: "Invalid PKCE cookie." },
      { status: 400 }
    );
  }

  if (state !== storedState) {
    return NextResponse.json(
      { error: "State mismatch — possible CSRF." },
      { status: 400 }
    );
  }

  // Exchange authorization code for access token
  const tokenResponse = await fetch(WHOP_OAUTH.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: WHOP_OAUTH.redirectUri,
      client_id: WHOP_OAUTH.clientId,
      client_secret: WHOP_OAUTH.clientSecret,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token exchange failed:", error);
    return NextResponse.json(
      {
        error: "Failed to exchange authorization code",
        detail: error,
        tokenUrl: WHOP_OAUTH.tokenUrl,
        redirectUri: WHOP_OAUTH.redirectUri,
      },
      { status: 502 }
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken: string = tokenData.access_token;

  // Fetch user info from Whop
  const userInfoResponse = await fetch(WHOP_OAUTH.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoResponse.ok) {
    console.error("User info fetch failed:", await userInfoResponse.text());
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 502 }
    );
  }

  const userInfo = await userInfoResponse.json();

  // Upsert user in database
  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    update: {
      email: userInfo.email ?? null,
      username: userInfo.preferred_username ?? null,
      displayName: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email ?? null,
      username: userInfo.preferred_username ?? null,
      displayName: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
  });

  // Store session data (iron-session is fine here — no redirect conflict)
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = accessToken;
  await session.save();

  // Clean up the PKCE cookie and redirect to returnTo or home
  const redirectPath =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/";
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.cookies.delete("oauth_pkce");
  return response;
}
