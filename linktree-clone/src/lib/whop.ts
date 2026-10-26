import { WhopClient } from "@whop/sdk";

const globalForWhop = globalThis as unknown as { whop: WhopClient };

export const whop =
  globalForWhop.whop ??
  new WhopClient({
    token: process.env.WHOP_API_KEY!,
    baseUrl: process.env.WHOP_BASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForWhop.whop = whop;

export function whopAsUser(oauthToken: string): WhopClient {
  return new WhopClient({
    token: oauthToken,
    baseUrl: process.env.WHOP_BASE_URL,
  });
}
