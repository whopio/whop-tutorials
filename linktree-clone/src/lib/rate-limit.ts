import { headers } from "next/headers";

// Minimal in-memory rate limiter. It keeps a sliding window of hit timestamps
// per key. NOTE: this is per-instance only. On serverless each function
// instance has its own Map, so treat this as a basic abuse guard, not a hard
// distributed limit. For production-grade limits use a shared store such as
// Upstash Redis.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

// Best-effort client IP from the proxy headers Vercel sets. Falls back to a
// constant so a missing header degrades to a shared bucket rather than no limit.
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
