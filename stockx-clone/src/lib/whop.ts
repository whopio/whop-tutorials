import { Whop } from "@whop/sdk";
import { env } from "@/lib/env";

let _whopsdk: Whop | undefined;

export function getWhopSDK(): Whop {
  if (!_whopsdk) {
    _whopsdk = new Whop({
      appID: env.WHOP_APP_ID,
      apiKey: env.WHOP_API_KEY,
      webhookKey: btoa(env.WHOP_WEBHOOK_SECRET),
      baseURL: `${env.WHOP_API_BASE}/api/v1`,
    });
  }
  return _whopsdk;
}

/** @deprecated Use getWhopSDK() for lazy initialization. Kept for import compatibility. */
export const whopsdk = new Proxy({} as Whop, {
  get(_, prop) {
    const sdk = getWhopSDK();
    const value = sdk[prop as keyof Whop];
    if (typeof value === "function") {
      return value.bind(sdk);
    }
    return value;
  },
});
