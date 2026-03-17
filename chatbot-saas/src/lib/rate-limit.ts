import { NextResponse } from "next/server";

interface RateLimitConfig {
  interval: number;
  maxRequests: number;
}

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

/**
 * Simple in-memory rate limiter.
 * Returns null if allowed, NextResponse if rate limited.
 *
 * Note: In-memory storage resets on serverless cold starts and is not
 * shared across instances. For production, use a Redis-backed solution
 * like @upstash/ratelimit.
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
