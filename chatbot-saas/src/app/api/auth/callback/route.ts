import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();

  // Clear PKCE and state early so they can't be reused on error
  const codeVerifier = session.codeVerifier;
  const savedState = session.oauthState;
  delete session.codeVerifier;
  delete session.oauthState;
  await session.save();

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/sign-in?error=missing_code", request.url));
    }

    if (!codeVerifier) {
      return NextResponse.redirect(new URL("/sign-in?error=missing_verifier", request.url));
    }

    // Validate state to prevent login CSRF
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(new URL("/sign-in?error=invalid_state", request.url));
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(WHOP_OAUTH.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: WHOP_OAUTH.redirectUri,
        client_id: WHOP_OAUTH.clientId,
        client_secret: WHOP_OAUTH.clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenResponse.status);
      return NextResponse.redirect(new URL("/sign-in?error=token_exchange", request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string = tokenData.access_token;

    // Fetch user info from Whop
    const userInfoResponse = await fetch(WHOP_OAUTH.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      console.error("User info fetch failed:", userInfoResponse.status);
      return NextResponse.redirect(new URL("/sign-in?error=userinfo", request.url));
    }

    const userInfo = await userInfoResponse.json();

    // Validate and sanitize user data
    const avatarUrl =
      typeof userInfo.picture === "string" && userInfo.picture.startsWith("https://")
        ? userInfo.picture
        : null;
    const name =
      typeof userInfo.name === "string" ? userInfo.name.slice(0, 100) : null;

    // Upsert user in database
    // Whop's /oauth/userinfo returns standard OIDC fields:
    // sub, name, preferred_username, picture, email
    const user = await prisma.user.upsert({
      where: { whopUserId: userInfo.sub },
      update: {
        email: userInfo.email ?? null,
        name,
        avatarUrl,
      },
      create: {
        whopUserId: userInfo.sub,
        email: userInfo.email ?? null,
        name,
        avatarUrl,
      },
    });

    // Store session data
    session.userId = user.id;
    session.whopUserId = user.whopUserId;
    session.accessToken = accessToken;
    await session.save();

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/sign-in?error=unknown", request.url));
  }
}
