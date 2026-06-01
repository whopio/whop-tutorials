import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Per-route rate limits for write endpoints. Reads (GET) bypass entirely.
const LIMITS: { match: RegExp; limit: number; windowMs: number }[] = [
  { match: /^\/api\/stories\/[^/]+\/(like|bookmark|read)$/, limit: 60, windowMs: 60_000 },
  { match: /^\/api\/stories\/[^/]+\/tip$/, limit: 10, windowMs: 60_000 },
  { match: /^\/api\/stories\b/, limit: 30, windowMs: 60_000 },
  { match: /^\/api\/me\/profile$/, limit: 20, windowMs: 60_000 },
  { match: /^\/api\/users\/[^/]+\/follow$/, limit: 30, windowMs: 60_000 },
  { match: /^\/api\/topics\/[^/]+\/follow$/, limit: 30, windowMs: 60_000 },
  { match: /^\/api\/membership\/(checkout|pause|resume|cancel|uncancel)$/, limit: 20, windowMs: 60_000 },
  { match: /^\/api\/writers\/(onboard|kyc-return)$/, limit: 10, windowMs: 60_000 },
  { match: /^\/api\/admin\/operators(\/[^/]+)?$/, limit: 30, windowMs: 60_000 },
  { match: /^\/api\/promo-codes(\/[^/]+\/archive)?$/, limit: 30, windowMs: 60_000 },
  { match: /^\/api\/notifications\/mark-read$/, limit: 30, windowMs: 60_000 },
];

function clientKey(req: NextRequest): string {
  // Prefer the iron-session cookie when present so authenticated users get a
  // stable per-user bucket; fall back to IP for anonymous abuse paths.
  const session = req.cookies.get("storyline_session")?.value;
  if (session) return `session:${session}`;
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}

export function proxy(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }
  // Webhooks have their own signature verification — never rate-limit Whop's deliveries.
  if (req.nextUrl.pathname.startsWith("/api/webhooks/")) return NextResponse.next();
  // Cron is guarded by the CRON_SECRET header — no rate limit.
  if (req.nextUrl.pathname.startsWith("/api/cron/")) return NextResponse.next();

  const rule = LIMITS.find((r) => r.match.test(req.nextUrl.pathname));
  if (!rule) return NextResponse.next();

  const key = `${clientKey(req)}:${req.nextUrl.pathname}`;
  const result = rateLimit(key, rule.limit, rule.windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rule.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(rule.limit));
  res.headers.set("X-RateLimit-Remaining", String(result.remaining));
  res.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
