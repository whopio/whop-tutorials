import { getEnv } from "@/lib/env";
import { whopPost, type WhopErrorBody } from "@/lib/whop";
import { toRequestBody, type Application } from "@/lib/formation/schema";
import { fieldFor } from "@/lib/formation/errors";

// The sandbox runs the whole validation pass and then stops on this, at the
// exact point it would have created the formation checkout. It is the closest
// thing the sandbox has to a 200, and it is the reason a public demo can call
// this endpoint for real without anyone forming a company.
const SELLER_NOT_CONFIGURED = "Incorporation seller company is not configured";

// What production sends back instead, captured from a real call on
// 2026-08-25 so the demo can show the shape without inventing it.
export const PRODUCTION_EXAMPLE = {
  checkout_url: "https://whop.com/checkout/ch_xxxxxxxxxxxxxxx/",
  checkout_session_id: "ch_xxxxxxxxxxxxxxx",
  total: 50000,
  currency: "usd",
} as const;

export interface FormationCheckout {
  checkout_url: string;
  checkout_session_id: string;
  total: number;
  currency: string;
}

export type PreflightResult =
  // Whop accepted the application. The sandbox cannot go further.
  | { outcome: "accepted"; request: Record<string, unknown> }
  // Whop refused it, and said why.
  | { outcome: "rejected"; request: Record<string, unknown>; error: WhopErrorBody; field: string | null }
  // Only reachable if this ever runs somewhere the seller company exists.
  | { outcome: "checkout"; request: Record<string, unknown>; checkout: FormationCheckout };

export async function preflight(
  application: Application,
  idempotencyKey: string,
): Promise<PreflightResult> {
  const env = getEnv();
  const request = toRequestBody(application);

  const response = await whopPost<FormationCheckout>(
    `/accounts/${env.WHOP_COMPANY_ID}/form_company`,
    request,
    idempotencyKey,
  );

  if (response.ok) {
    return { outcome: "checkout", request, checkout: response.data };
  }

  if (response.error.message === SELLER_NOT_CONFIGURED) {
    return { outcome: "accepted", request };
  }

  return {
    outcome: "rejected",
    request,
    error: response.error,
    field: fieldFor(response.error.message),
  };
}
