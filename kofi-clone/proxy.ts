import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "kofi_session";

export function proxy(req: NextRequest) {
  // Edge guard: only check that the session cookie is present. The real
  // validation (decrypting and verifying the iron-session) happens on the Node
  // runtime via requireAuth(), where iron-session reliably reads the cookie.
  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/api/auth/login", req.url);
    url.searchParams.set("returnTo", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/feed", "/feed/:path*"],
};
