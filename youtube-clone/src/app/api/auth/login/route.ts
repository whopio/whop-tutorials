import { type NextRequest, NextResponse } from "next/server";
import { randomToken, pkceChallenge } from "@/lib/pkce";
import { buildAuthorizeUrl } from "@/lib/whop-oauth";
import { PKCE_COOKIE, sessionCookieOptions } from "@/lib/session-config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Only a local path is allowed as a post-login target. The URL parser strips
 * tabs/newlines and treats "\" like "/", so we validate the RESOLVED target
 * against a placeholder origin instead of pattern-matching the raw string. */
export function safeNext(raw: string | null | undefined): string | undefined {
  if (!raw || !raw.startsWith("/")) return undefined;
  try {
    const resolved = new URL(raw, "http://internal");
    if (resolved.origin !== "http://internal") return undefined;
    return resolved.pathname + resolved.search;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(`auth-login:${clientIp(request)}`, 20, 60_000);
  if (!rl.ok) {
    return new NextResponse("Too many requests - try again shortly.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  const verifier = randomToken(32);
  const state = randomToken(16);
  const nonce = randomToken(16);
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const codeChallenge = await pkceChallenge(verifier);

  const res = NextResponse.redirect(
    buildAuthorizeUrl({ state, nonce, codeChallenge }),
  );

  // PKCE lives in its OWN short-lived httpOnly cookie (gotcha 16): the
  // iron-session cookie can be dropped across the cross-site redirect to Whop.
  // We also stash the (validated) post-login destination here.
  res.cookies.set(
    PKCE_COOKIE,
    JSON.stringify({ verifier, state, nonce, next }),
    { ...sessionCookieOptions, maxAge: 600 },
  );

  return res;
}
