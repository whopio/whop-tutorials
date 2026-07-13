// Production credentials for the live <ChatElement> surface. Kept separate from
// lib/env.ts (which stays single-company, exactly as the article teaches) so the
// app can hold both the sandbox company (Chat API tab) and the production company
// (Prebuilt embed tab) at once.
//
// Guarded: when the prod vars are absent the app still builds and runs, and the
// live-element section renders a "provisions once production credentials are
// added" placeholder instead of throwing.

export type ProdEnv = {
  configured: boolean;
  apiKey: string;
  companyId: string;
  resetSecret: string | null;
};

let cached: ProdEnv | null = null;

export function getProdEnv(): ProdEnv {
  if (cached) return cached;
  const apiKey = process.env.WHOP_PROD_API_KEY?.trim() ?? "";
  const companyId = process.env.WHOP_PROD_COMPANY_ID?.trim() ?? "";
  cached = {
    configured: apiKey.startsWith("apik_") && companyId.startsWith("biz_"),
    apiKey,
    companyId,
    resetSecret: process.env.RESET_SECRET?.trim() || null,
  };
  return cached;
}
