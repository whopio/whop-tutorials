import { cookies } from "next/headers";
import { z } from "zod";
import type { PkceState } from "@/lib/whop-oauth";

const PKCE_COOKIE = "whop_pkce";

const pkceSchema = z.object({
  codeVerifier: z.string(),
  state: z.string(),
  nonce: z.string(),
});

export async function setPkceCookie(pkce: PkceState): Promise<void> {
  const store = await cookies();
  store.set(PKCE_COOKIE, JSON.stringify(pkce), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function readPkceCookie(): Promise<PkceState | null> {
  const store = await cookies();
  const value = store.get(PKCE_COOKIE)?.value;
  if (!value) return null;
  try {
    return pkceSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}

export async function clearPkceCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PKCE_COOKIE);
}
