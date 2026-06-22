import Whop from "@whop/sdk";
import { getEnv } from "@/lib/env";

let cached: Whop | null = null;

export function getWhop(): Whop {
  if (cached) return cached;
  const env = getEnv();
  cached = new Whop({
    apiKey: env.WHOP_COMPANY_API_KEY,
    // The sandbox override must include the /api/v1 path. Without the
    // override the SDK defaults to production, and a sandbox key then
    // fails with 401s that look like a bad API key.
    baseURL: env.WHOP_SANDBOX
      ? "https://sandbox-api.whop.com/api/v1"
      : "https://api.whop.com/api/v1",
  });
  return cached;
}
