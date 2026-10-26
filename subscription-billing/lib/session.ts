import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

// The subscriber signs in with Whop. Their Whop user id is how the app finds
// their subscription, and their email prefills the checkout so the membership
// lands on that same Whop user.
export interface SessionData {
  whopUserId?: string;
  email?: string;
}

function sessionOptions(): SessionOptions {
  return {
    password: getEnv().SESSION_SECRET,
    cookieName: "whop_billing_demo",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
