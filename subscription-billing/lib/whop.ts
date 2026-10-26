import { WhopClient, WhopEnvironment } from "@whop/sdk";
import { getEnv } from "@/lib/env";

let cached: WhopClient | null = null;

// One client for the whole app, signed with your company API key.
export function getWhop(): WhopClient {
  if (cached) return cached;
  const env = getEnv();
  cached = new WhopClient({
    token: env.WHOP_COMPANY_API_KEY,
    environment: env.WHOP_SANDBOX ? WhopEnvironment.Sandbox : WhopEnvironment.Production,
  });
  return cached;
}
