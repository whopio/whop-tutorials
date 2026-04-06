// src/lib/whop.ts
import Whop from "@whop/sdk";

const isSandbox = process.env.WHOP_SANDBOX === "true";

// App API key client — used for general operations (companies, accountLinks).
let _whop: Whop | null = null;

export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      apiKey: process.env.WHOP_API_KEY!,
      webhookKey: process.env.WHOP_WEBHOOK_SECRET
        ? Buffer.from(process.env.WHOP_WEBHOOK_SECRET).toString("base64")
        : undefined,
      ...(isSandbox && { baseURL: "https://sandbox-api.whop.com/api/v1" }),
    });
  }
  return _whop;
}

// Company API key client — used for operations that need company-level permissions
// (products.create, checkoutConfigurations.create on child companies).
// No appID — the company key authenticates directly.
let _companyWhop: Whop | null = null;

export function getCompanyWhop(): Whop {
  if (!_companyWhop) {
    _companyWhop = new Whop({
      apiKey: process.env.WHOP_COMPANY_API_KEY!,
      ...(isSandbox && { baseURL: "https://sandbox-api.whop.com/api/v1" }),
    });
  }
  return _companyWhop;
}

export const WHOP_OAUTH_BASE = isSandbox
  ? "https://sandbox-api.whop.com"
  : "https://api.whop.com";
