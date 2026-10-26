import { WhopClient, WhopEnvironment } from "@whop/sdk";
import { env } from "./env";

export const whop = new WhopClient({
  token: env.WHOP_API_KEY,
  environment:
    env.WHOP_SANDBOX === "true"
      ? WhopEnvironment.Sandbox
      : WhopEnvironment.Production,
});

export function getWhopBaseUrl() {
  return env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";
}
