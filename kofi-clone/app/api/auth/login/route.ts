import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, randomString } from "@/lib/oauth";
import { PKCE_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  // The homepage "claim your URL" widget passes a handle; carry it into onboarding.
  const handle = (params.get("handle") || "").trim();
  const explicitReturnTo = params.get("returnTo");
  // With no explicit destination, leave returnTo empty so the OAuth callback can
  // route by account type (creators -> /dashboard, supporters -> /feed).
  const returnTo = handle
    ? `/dashboard/start?handle=${encodeURIComponent(handle)}`
    : explicitReturnTo && explicitReturnTo.startsWith("/")
      ? explicitReturnTo
      : "";
  const pkce = {
    verifier: randomString(32),
    state: randomString(16),
    nonce: randomString(16),
    returnTo,
  };

  const res = NextResponse.redirect(buildAuthorizeUrl(pkce));
  res.cookies.set(PKCE_COOKIE, JSON.stringify(pkce), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
