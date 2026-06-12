import { z } from "zod";

// Handles that collide with our top-level routes (or are otherwise off-limits),
// so a creator page at /[username] can never shadow them.
export const RESERVED_USERNAMES = new Set([
  "dashboard", "signin", "api", "oauth", "explore", "admin", "settings", "about",
  "login", "register", "account", "creator", "support", "help", "terms", "privacy",
  "feed", "features",
]);

export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores");

export type UsernameFormat = { ok: true } | { ok: false; reason: string };

// Format + reserved-word check shared by the availability endpoint and the
// create-page route, so both agree on what counts as a usable handle.
export function checkUsernameFormat(value: string): UsernameFormat {
  const parsed = usernameSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "Invalid username" };
  }
  if (RESERVED_USERNAMES.has(value)) {
    return { ok: false, reason: "That username is reserved" };
  }
  return { ok: true };
}
