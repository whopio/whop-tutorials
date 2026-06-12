import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  whopUserId?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "kofi_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const PKCE_COOKIE = "kofi_pkce";
