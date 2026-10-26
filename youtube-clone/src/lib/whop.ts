import "server-only";
import { WhopClient, WhopEnvironment } from "@whop/sdk";
import { env, isSandbox } from "./env";

// SDK 2.x picks the API host (and the vault host) from `environment`. It reads
// no env vars of its own, so the sandbox switch has to be passed explicitly.
const environment = isSandbox()
  ? WhopEnvironment.Sandbox
  : WhopEnvironment.Production;

/**
 * Company-key client — products, plans, checkout configurations, connected
 * accounts, payouts. Uses the platform Company API Key (`access_pass:create`
 * scope). Webhooks don't need a client: the route verifies them with
 * `unwrapWebhook` from `@whop/sdk/helpers` and the raw signing secret.
 */
export const whopCompany = new WhopClient({
  token: env.WHOP_COMPANY_API_KEY,
  environment,
});

