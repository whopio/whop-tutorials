import Whop from "@whop/sdk";
import { getProdEnv } from "@/lib/prod-env";

// Production SDK client for the live-element surface. Always points at the
// production host; the sandbox client in lib/whop.ts is untouched.
let cached: Whop | null = null;

export function getWhopProd(): Whop {
  if (cached) return cached;
  const env = getProdEnv();
  if (!env.configured) {
    throw new Error("production company not configured (WHOP_PROD_* env missing)");
  }
  cached = new Whop({
    apiKey: env.apiKey,
    baseURL: "https://api.whop.com/api/v1",
  });
  return cached;
}
