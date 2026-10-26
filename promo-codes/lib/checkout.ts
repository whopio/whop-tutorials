import { WHOP_IDS } from "@/constants/whop-ids";
import { getEnv } from "@/lib/env";
import { getWhop } from "@/lib/whop";

let cached: Promise<string | null> | null = null;

/**
 * The checkout configuration the embedded checkout mounts with.
 *
 * Elements' `returnUrl` only covers off-site steps such as 3D Secure. Where the
 * buyer goes after paying comes from a checkout configuration's `redirect_url`.
 * Without one, a buyer whose email has no Whop account is sent to Whop's
 * account claim page and never comes back here. With one, every buyer lands
 * on this page with `payment_id` and `status=success` on the URL.
 *
 * Whop only accepts an https redirect, so local development on http gets no
 * configuration and the checkout mounts with the plan alone.
 */
export function getCheckoutConfigurationId(): Promise<string | null> {
  if (cached) return cached;
  const env = getEnv();
  if (!env.APP_URL.startsWith("https://")) return Promise.resolve(null);

  cached = getWhop()
    .checkoutConfigurations.create({
      account_id: env.WHOP_COMPANY_ID,
      plan_id: WHOP_IDS.planId,
      redirect_url: `${env.APP_URL}/`,
    })
    .then((configuration) => configuration.id)
    .catch((error: unknown) => {
      // Let the next request try again instead of caching the failure.
      cached = null;
      throw error;
    });
  return cached;
}
