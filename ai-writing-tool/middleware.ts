import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface SessionData {
  whopUserId?: string;
  userId?: string;
}

export async function middleware(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), {
    password: process.env.SESSION_SECRET!,
    cookieName: "pencraft_session",
  });

  const isAuthenticated = session.userId || session.whopUserId;
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*"],
};
