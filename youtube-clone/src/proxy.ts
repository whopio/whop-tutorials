import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, PROTECTED_PREFIXES } from "@/lib/session-config";

// Next.js 16 request proxy (formerly "middleware"). Route-level auth guard.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/feed/history/:path*",
    "/feed/subscriptions/:path*",
    "/feed/you/:path*",
  ],
};
