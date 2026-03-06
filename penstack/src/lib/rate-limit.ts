import { NextResponse } from "next/server";

interface RateLimitConfig {
  interval: number; // ms
  maxRequests: number;
}

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

/**
 * Simple in-memory rate limiter.
 * For production at scale, replace with Redis-backed rate limiting.
 *
 * @returns null if allowed, NextResponse if rate limited
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig = { interval: 60_000, maxRequests: 30 }
): NextResponse | null {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.lastReset > config.interval) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((config.interval - (now - entry.lastReset)) / 1000)
          ),
        },
      }
    );
  }

  entry.count++;
  return null;
}

/**
 * Clean up stale entries periodically to prevent memory leaks.
 * Runs every 5 minutes.
 */
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now - entry.lastReset > 10 * 60 * 1000) {
        rateLimitMap.delete(key);
      }
    }
  }, CLEANUP_INTERVAL).unref?.();
}
