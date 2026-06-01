import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { whopOauthBaseUrl } from "@/lib/whop-oauth";
import { prisma } from "@/lib/prisma";
import { generateUsername } from "@/lib/utils";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
}

interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  preferred_username?: string;
}

export async function GET(req: NextRequest) {
  const c = await cookies();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const verifier = c.get("storyline_pkce_verifier")?.value;
  const expectedState = c.get("storyline_oauth_state")?.value;
  const returnTo = c.get("storyline_oauth_return_to")?.value || "/";

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?auth_error=state_mismatch`,
    );
  }

  const tokenRes = await fetch(`${whopOauthBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?auth_error=token_exchange_failed`,
    );
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  const userinfoRes = await fetch(`${whopOauthBaseUrl}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userinfoRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?auth_error=userinfo_failed`,
    );
  }
  const userinfo = (await userinfoRes.json()) as UserInfo;

  const lowerEmail = (userinfo.email || "").toLowerCase();

  // Username generation: derive from preferred_username/name; suffix if taken.
  let baseUsername = (userinfo.preferred_username || userinfo.name || "writer")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!baseUsername) baseUsername = "writer";
  let username = baseUsername;
  let attempts = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = generateUsername(baseUsername);
    if (++attempts > 5) break;
  }

  const user = await prisma.user.upsert({
    where: { whopUserId: userinfo.sub },
    create: {
      whopUserId: userinfo.sub,
      email: lowerEmail,
      name: userinfo.name,
      avatar: userinfo.picture,
      username,
    },
    update: {
      email: lowerEmail,
      name: userinfo.name,
      avatar: userinfo.picture,
    },
  });

  // Link any pending operator invite (by lowercased email).
  if (lowerEmail) {
    await prisma.operator.updateMany({
      where: { email: lowerEmail, userId: null },
      data: { userId: user.id },
    });
  }

  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = tokens.access_token;
  await session.save();

  c.delete("storyline_pkce_verifier");
  c.delete("storyline_oauth_state");
  c.delete("storyline_oauth_return_to");

  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}${returnTo}`);
}
