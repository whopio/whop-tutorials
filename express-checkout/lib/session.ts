import {
  getIronSession,
  type IronSession,
  type SessionOptions,
} from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

// The demo session survives the step-4 redirect round-trip: that is the
// whole lesson. It holds the payment from each completion path.
export interface SessionData {
  callbackPaymentId?: string;
  redirectPaymentId?: string;
  redirectStateId?: string;
}

export function sessionOptions(): SessionOptions {
  return {
    password: getEnv().SESSION_SECRET,
    cookieName: "whop_express_demo",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}
