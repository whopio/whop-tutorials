import Whop from "@whop/sdk";
import { getEnv } from "@/lib/env";

let cached: Whop | null = null;

export function getWhop(): Whop {
  if (cached) return cached;
  const env = getEnv();
  cached = new Whop({
    apiKey: env.WHOP_COMPANY_API_KEY,
    baseURL: env.WHOP_SANDBOX
      ? "https://sandbox-api.whop.com/api/v1"
      : "https://api.whop.com/api/v1",
  });
  return cached;
}
