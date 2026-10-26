import { NextResponse, type NextRequest } from "next/server";
import { allow } from "@/lib/rate-limit";

const MINUTE = 60 * 1000;

// Requests per minute from one address. Each of these reaches the Whop API
// on the shared sandbox key, so the strictest limits sit on the routes that write.
const LIMITS: { prefix: string; limit: number }[] = [
  { prefix: "/api/auth/", limit: 10 },
  { prefix: "/api/subscription", limit: 20 },
  { prefix: "/api/", limit: 60 },
  { prefix: "/", limit: 60 },
];

function clientAddress(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Writes only come from this site's own pages. The session cookie is
// SameSite=Lax already, this closes the gap for anything that ignores it.
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Whop's webhook deliveries come from Whop, not this site. The route checks
  // their signature instead.
  const isWebhook = pathname === "/api/webhooks/whop";

  if (request.method !== "GET" && request.method !== "HEAD" && !isWebhook && !sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }

  const rule = LIMITS.find((entry) => pathname.startsWith(entry.prefix)) ?? { prefix: "/", limit: 60 };
  if (!allow(`${clientAddress(request)}:${rule.prefix}`, rule.limit, MINUTE)) {
    return isApi
      ? NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 })
      : new NextResponse("Too many requests. Wait a minute and try again.", { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
