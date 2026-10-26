import { WhopClient, WhopEnvironment } from "@whop/sdk";

const isSandbox = process.env.WHOP_SANDBOX === "true";

const environment = isSandbox
  ? WhopEnvironment.Sandbox
  : WhopEnvironment.Production;

let _whop: WhopClient | null = null;

export function getWhop(): WhopClient {
  if (!_whop) {
    _whop = new WhopClient({
      token: process.env.WHOP_API_KEY!,
      environment,
    });
  }
  return _whop;
}

let _companyWhop: WhopClient | null = null;

export function getCompanyWhop(): WhopClient {
  if (!_companyWhop) {
    _companyWhop = new WhopClient({
      token: process.env.WHOP_COMPANY_API_KEY!,
      environment,
    });
  }
  return _companyWhop;
}

export const WHOP_OAUTH_BASE = isSandbox
  ? "https://sandbox-api.whop.com"
  : "https://api.whop.com";
