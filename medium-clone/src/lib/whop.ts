import Whop from "@whop/sdk";

// Lazy — evaluated per call, not at module load. Standalone scripts call
// `dotenv.config()` AFTER ES module imports are hoisted; reading env at module
// scope means WHOP_SANDBOX is unset and we silently fall back to production.
// Same hazard applies to WHOP_WEBHOOK_SECRET.
function resolveBaseURL(): string {
  return process.env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1";
}

function webhookKey() {
  return Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString("base64");
}

// App API key — OAuth, webhooks, notifications, generic SDK ops.
export function getWhop() {
  return new Whop({
    apiKey: process.env.WHOP_APP_API_KEY!,
    webhookKey: webhookKey(),
    baseURL: resolveBaseURL(),
  });
}

// Company API key — products, plans, checkout configurations, transfers, promo codes.
export function getCompanyWhop() {
  return new Whop({
    apiKey: process.env.WHOP_COMPANY_API_KEY!,
    webhookKey: webhookKey(),
    baseURL: resolveBaseURL(),
  });
}
