import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getCookie(req: NextRequest, name: string): string | null {
  return req.cookies.get(name)?.value ?? null;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const returnedState = req.nextUrl.searchParams.get("state");
  const codeVerifier = getCookie(req, "pkce_verifier");
  const expectedState = getCookie(req, "oauth_state");

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_code`);
  }
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_verifier`);
  }
  if (returnedState !== expectedState) {
    return NextResponse.redirect(`${APP_URL}/?error=state_mismatch`);
  }

  // 1. Exchange code for access token
  const whopBase = process.env.WHOP_OAUTH_BASE ?? "https://api.whop.com";
  const tokenRes = await fetch(`${whopBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: process.env.WHOP_CLIENT_ID!,
      client_secret: process.env.WHOP_CLIENT_SECRET!,
      redirect_uri: process.env.WHOP_REDIRECT_URI!,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[auth/callback] token exchange failed:", err);
    return NextResponse.redirect(`${APP_URL}/?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();

  // 2. Extract user ID from the id_token JWT (openid scope gives us this)
  const idToken: string = tokenData.id_token;
  if (!idToken) {
    // Don't log tokenData itself — it may contain access_token / refresh_token.
    console.error("[auth/callback] no id_token in response", {
      keys: Object.keys(tokenData ?? {}),
    });
    return NextResponse.redirect(`${APP_URL}/?error=no_id_token`);
  }

  const payloadB64 = idToken.split(".")[1];
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf-8")
  );
  const whopUserId: string = payload.sub;
  const email: string | null = payload.email ?? null;

  if (!whopUserId) {
    // Don't log payload itself — it contains the user's email and other claims.
    console.error("[auth/callback] no sub in id_token payload", {
      keys: Object.keys(payload ?? {}),
    });
    return NextResponse.redirect(`${APP_URL}/?error=no_sub_claim`);
  }

  // 3. Upsert user in DB. Always update email in case it changed.
  const user = await prisma.user.upsert({
    where: { whopUserId },
    update: { email },
    create: { whopUserId, email },
  });

  // 4. Set session
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = whopUserId;
  await session.save();

  // 5. Clear PKCE cookies and redirect
  const res = NextResponse.redirect(`${APP_URL}/dashboard`);
  res.cookies.delete("pkce_verifier");
  res.cookies.delete("oauth_state");
  return res;
}
