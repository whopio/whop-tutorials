import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "./env";

export interface SessionData {
  userId?: string;
}

const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: "pencraft_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
