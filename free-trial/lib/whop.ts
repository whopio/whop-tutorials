import { WhopClient, WhopEnvironment } from "@whop/sdk";
import { getEnv } from "@/lib/env";

let cached: WhopClient | null = null;

export function getWhop(): WhopClient {
  if (cached) return cached;
  const env = getEnv();
  cached = new WhopClient({
    token: env.WHOP_COMPANY_API_KEY,
    // Without WHOP_SANDBOX=true the client talks to production, and a
    // sandbox key then fails with 401s that look like a bad API key.
    environment: env.WHOP_SANDBOX
      ? WhopEnvironment.Sandbox
      : WhopEnvironment.Production,
  });
  return cached;
}
