import "server-only";
import { cache } from "react";
import { getIronSession, sealData } from "iron-session";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { env } from "./env";
import { SESSION_COOKIE, sessionCookieOptions } from "./session-config";

export type SessionUser = {
  id: string; // DB User.id (cuid)
  whopUserId: string; // Whop user id (sub)
  username: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export interface SessionData {
  user?: SessionUser;
  accessToken?: string;
}

const sessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: SESSION_COOKIE,
  cookieOptions: sessionCookieOptions,
};

/** Read/mutate the session via the cookie store (server components, logout). */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const user = (await getSession()).user;
  // No id (a pre-AUTH-6 cookie) → logged-out, before it can reach any query.
  if (!user || typeof user.id !== "string" || user.id.length === 0) return null;
  // The id is well-formed but may be ORPHANED: a cookie can outlive its User row
  // (a DB reset, a re-seed that deleted+recreated the user with a new id, or a
  // removed account). An orphaned id passes the string check yet FK-violates
  // every write keyed to it (reaction/subscription/comment/channel) — exactly
  // the "reads work, all writes crash" failure. Verify the row exists; a missing
  // row means "sign in again", not a Prisma foreign-key crash on the next write.
  // cache() memoizes this per request, so it costs one lookup, not one per call.
  const exists = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  return exists ? user : null;
});

/**
 * Seal the session and write it directly onto a response. Used in the OAuth
 * callback because mutating the cookie store and returning NextResponse.redirect
 * can silently drop the Set-Cookie (Whop OAuth gotcha 16).
 */
export async function writeSessionCookie(res: NextResponse, data: SessionData) {
  const sealed = await sealData(data, { password: env.SESSION_SECRET });
  res.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions);
}
