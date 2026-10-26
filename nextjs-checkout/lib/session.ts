import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { z } from "zod";

export interface SessionData {
  userId?: string;
  email?: string;
}

// The stub sign-in is demo-only, so its secret is checked here and lib/env.ts
// stays identical to the article's env.ts.
const sessionSecret = z.string().min(32).parse(process.env.SESSION_SECRET);

const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "demo_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
