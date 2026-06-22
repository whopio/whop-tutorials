import {
  getIronSession,
  type IronSession,
  type SessionOptions,
} from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export interface SessionData {
  whopUserId?: string;
  username?: string;
  unlockedAt?: number;
}

export function sessionOptions(): SessionOptions {
  return {
    password: getEnv().SESSION_SECRET,
    cookieName: "whop_session",
    ttl: 60 * 60 * 24 * 7, // 7 days
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}
