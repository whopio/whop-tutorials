import { WhopClient, WhopEnvironment } from "@whop/sdk";

// Lazy — evaluated per call, not at module load. Standalone scripts call
// `dotenv.config()` AFTER ES module imports are hoisted; reading env at module
// scope means WHOP_SANDBOX is unset and we silently fall back to production.
function resolveEnvironment() {
  return process.env.WHOP_SANDBOX === "true"
    ? WhopEnvironment.Sandbox
    : WhopEnvironment.Production;
}

// App API key — OAuth, notifications, generic SDK ops.
export function getWhop() {
  return new WhopClient({
    token: process.env.WHOP_APP_API_KEY!,
    environment: resolveEnvironment(),
  });
}

// Company API key — products, plans, checkout configurations, transfers, promo codes.
export function getCompanyWhop() {
  return new WhopClient({
    token: process.env.WHOP_COMPANY_API_KEY!,
    environment: resolveEnvironment(),
  });
}
