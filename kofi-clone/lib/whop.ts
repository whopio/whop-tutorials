import { Whop } from "@whop/sdk";
import { env, isSandbox, whopApiBaseUrl } from "./env";

function webhookKey(): string | null {
  const secret = env.WHOP_WEBHOOK_SECRET;
  if (!secret) return null;
  return Buffer.from(secret).toString("base64");
}

export const whopsdk = new Whop({
  apiKey: env.WHOP_COMPANY_API_KEY,
  webhookKey: webhookKey(),
  ...(isSandbox() ? { baseURL: whopApiBaseUrl() } : {}),
});
