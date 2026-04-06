import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    const pkceCookie = request.cookies.get("oauth_pkce")?.value;
    if (!pkceCookie) {
      return NextResponse.redirect(
        new URL("/sign-in?error=missing_pkce", request.url)
      );
    }

    let verifier: string;
    let savedState: string;
    try {
      const parsed = JSON.parse(pkceCookie);
      verifier = parsed.verifier;
      savedState = parsed.state;
    } catch {
      return NextResponse.redirect(
        new URL("/sign-in?error=invalid_pkce", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/sign-in?error=missing_code", request.url)
      );
    }
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL("/sign-in?error=invalid_state", request.url)
      );
    }

    const tokenResponse = await fetch(WHOP_OAUTH.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: WHOP_OAUTH.redirectUri,
        client_id: WHOP_OAUTH.clientId,
        client_secret: WHOP_OAUTH.clientSecret,
        code_verifier: verifier,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenResponse.status);
      return NextResponse.redirect(
        new URL("/sign-in?error=token_exchange", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string = tokenData.access_token;

    const userInfoResponse = await fetch(WHOP_OAUTH.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL("/sign-in?error=userinfo", request.url)
      );
    }

    const userInfo = await userInfoResponse.json();

    const avatarUrl =
      typeof userInfo.picture === "string" &&
      userInfo.picture.startsWith("https://")
        ? userInfo.picture
        : null;
    const name =
      typeof userInfo.name === "string" ? userInfo.name.slice(0, 100) : null;

    const user = await prisma.user.upsert({
      where: { whopUserId: userInfo.sub },
      update: { email: userInfo.email ?? null, name, avatarUrl },
      create: {
        whopUserId: userInfo.sub,
        email: userInfo.email ?? null,
        name,
        avatarUrl,
      },
    });

    const session = await getSession();
    session.userId = user.id;
    session.whopUserId = user.whopUserId;
    session.accessToken = accessToken;
    await session.save();

    const response = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    response.cookies.delete("oauth_pkce");
    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/sign-in?error=unknown", request.url)
    );
  }
}
