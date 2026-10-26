// A sliding window per key, kept in this server instance's memory. It stops
// bursts from one address, not a determined attacker spread across instances.
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    for (const [stale, times] of hits) {
      if (times.every((time) => now - time >= windowMs)) hits.delete(stale);
    }
  }
  return true;
}
