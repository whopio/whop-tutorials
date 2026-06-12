import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getUserInfo, type PkceState } from "@/lib/oauth";
import { PKCE_COOKIE } from "@/lib/session";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(oauthError)}`, base));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/?authError=missing_code", base));
  }

  const cookieStore = await cookies();
  const pkceRaw = cookieStore.get(PKCE_COOKIE)?.value;
  if (!pkceRaw) {
    return NextResponse.redirect(new URL("/?authError=missing_pkce", base));
  }

  let pkce: PkceState;
  try {
    pkce = JSON.parse(pkceRaw) as PkceState;
  } catch {
    return NextResponse.redirect(new URL("/?authError=bad_pkce", base));
  }
  if (pkce.state !== state) {
    return NextResponse.redirect(new URL("/?authError=state_mismatch", base));
  }

  let accessToken: string;
  let info: Awaited<ReturnType<typeof getUserInfo>>;
  try {
    const tokens = await exchangeCodeForTokens(code, pkce.verifier);
    accessToken = tokens.access_token;
    info = await getUserInfo(accessToken);
  } catch (err: unknown) {
    console.error("OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/?authError=token_exchange_failed", base));
  }

  const user = await prisma.user.upsert({
    where: { whopUserId: info.sub },
    update: {
      username: info.preferred_username ?? info.sub,
      name: info.name ?? null,
      email: info.email ?? null,
      avatarUrl: info.picture ?? null,
    },
    create: {
      whopUserId: info.sub,
      username: info.preferred_username ?? info.sub,
      name: info.name ?? null,
      email: info.email ?? null,
      avatarUrl: info.picture ?? null,
    },
  });

  // Write the session through the next/headers cookie store (the App Router way).
  // iron-session's (req, res) overload does not reliably emit Set-Cookie on a
  // NextResponse in production; saving via cookies() does.
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.isLoggedIn = true;
  await session.save();

  cookieStore.delete(PKCE_COOKIE);

  // No explicit destination: send creators to their dashboard and everyone else
  // (supporters) to the feed.
  let dest: string;
  if (pkce.returnTo && pkce.returnTo.startsWith("/")) {
    dest = pkce.returnTo;
  } else {
    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    dest = creator ? "/dashboard" : "/feed";
  }
  return NextResponse.redirect(new URL(dest, base));
}
