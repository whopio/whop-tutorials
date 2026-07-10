/**
 * Session constants shared between server code and middleware.
 * Kept free of `server-only` / `next/headers` so middleware can import it.
 */
export const SESSION_COOKIE = "wavora_session";
export const PKCE_COOKIE = "wavora_pkce";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/** Route prefixes that require an authenticated session. */
export const PROTECTED_PREFIXES = [
  "/studio",
  "/feed/history",
  "/feed/subscriptions",
  "/feed/you",
];
