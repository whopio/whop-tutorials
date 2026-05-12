import { Whop } from "@whop/sdk";

// Always use the versioned base URL — prevents WHOP_BASE_URL env var
// (which may be set without the /api/v1 suffix) from breaking API calls.
const WHOP_API_BASE = "https://api.whop.com/api/v1";

export const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY,
  baseURL: WHOP_API_BASE,
});

export function whopAsUser(oauthToken: string) {
  return new Whop({
    apiKey: oauthToken,
    baseURL: WHOP_API_BASE,
  });
}
