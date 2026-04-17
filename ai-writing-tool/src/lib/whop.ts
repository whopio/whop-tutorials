import Whop from "@whop/sdk";
import { env } from "./env";

export const whop = new Whop({
  apiKey: env.WHOP_API_KEY,
});

export function getWhopBaseUrl() {
  return env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";
}
