import { WhopClient } from "@whop/sdk";
import { getEnv } from "@/lib/env";

let cached: WhopClient | null = null;

export function getWhop(): WhopClient {
  if (cached) return cached;
  const env = getEnv();
  cached = new WhopClient({
    token: env.WHOP_COMPANY_API_KEY,
    baseUrl: env.WHOP_SANDBOX
      ? "https://sandbox-api.whop.com/api/v1"
      : "https://api.whop.com/api/v1",
  });
  return cached;
}
