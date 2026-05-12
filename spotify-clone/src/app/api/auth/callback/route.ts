import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function decodeJwt(token: string) {
  const payload = token.split(".")[1];
  const decoded = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(decoded) as { sub: string; email?: string };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("pkce_verifier")?.value;

  if (!code || !returnedState || returnedState !== storedState || !codeVerifier) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  // Exchange code for tokens — token endpoint is on the API domain
  const tokenEndpoint = `${process.env.WHOP_BASE_URL}/oauth/token`;
  const tokenRes = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.WHOP_CLIENT_ID as string,
      client_secret: process.env.WHOP_CLIENT_SECRET as string,
      redirect_uri: process.env.WHOP_REDIRECT_URI as string,
      code,
      code_verifier: codeVerifier,
    }),
  });

  const rawText = await tokenRes.text();

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", tokenRes.status, rawText);
    return NextResponse.json(
      { error: "Token exchange failed", detail: rawText },
      { status: 400 }
    );
  }

  let tokens: { id_token: string; access_token: string };
  try {
    tokens = JSON.parse(rawText);
  } catch {
    console.error("Token response is not JSON:", rawText);
    return NextResponse.json({ error: "Invalid token response" }, { status: 500 });
  }
  const { sub, email } = decodeJwt(tokens.id_token);

  // Upsert user
  const user = await prisma.user.upsert({
    where: { whopUserId: sub },
    update: { email },
    create: { whopUserId: sub, email },
  });

  // Set session
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = sub;
  await session.save();

  // Clear PKCE cookies
  cookieStore.delete("pkce_verifier");
  cookieStore.delete("oauth_state");

  return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL as string));
}
