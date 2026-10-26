import { WhopClient } from "@whop/sdk";
import { env } from "@/lib/env";

let _whop: WhopClient | null = null;

export function getWhop(): WhopClient {
  if (!_whop) {
    _whop = new WhopClient({
      token: env.WHOP_COMPANY_API_KEY,
      ...(env.WHOP_SANDBOX && {
        baseUrl: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _whop;
}
