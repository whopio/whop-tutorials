import { whopsdk } from "@/lib/whop";
import { env } from "@/lib/env";
import { centsToDollars } from "@/lib/fees";
import type { CheckoutKind } from "@/constants";

/** Create a connected account (child company) under our platform for a creator. */
export async function createConnectedCompany(params: {
  email: string;
  title: string;
  internalUserId: string;
}): Promise<string> {
  const company = await whopsdk.companies.create({
    email: params.email,
    parent_company_id: env.WHOP_PLATFORM_COMPANY_ID,
    title: params.title,
    metadata: { internal_user_id: params.internalUserId },
  });
  return company.id;
}

/** Hosted account link for KYC onboarding or the hosted payouts portal. */
export async function createAccountLink(params: {
  companyId: string;
  useCase: "account_onboarding" | "payouts_portal";
  returnUrl: string;
  refreshUrl: string;
}): Promise<string> {
  const link = await whopsdk.accountLinks.create({
    company_id: params.companyId,
    use_case: params.useCase,
    return_url: params.returnUrl,
    refresh_url: params.refreshUrl,
  });
  return link.url;
}

/** Short-lived access token used by the embedded payout portal for a company. */
export async function createCompanyAccessToken(companyId: string): Promise<string> {
  const { token } = await whopsdk.accessTokens.create({ company_id: companyId });
  return token;
}

export interface PayoutSnapshot {
  /** True once the connected account has finished KYC and can receive/withdraw funds. */
  activated: boolean;
  /** Raw payout-account status: connected | pending_verification | action_required | ... | null. */
  status: string | null;
  /** Withdrawable balance on the connected company's Whop ledger, in cents. */
  availableCents: number;
  /** Not-yet-settled balance on the connected company's Whop ledger, in cents. */
  pendingCents: number;
}

/**
 * Read a connected company's Whop ledger to learn its payout-account (KYC) status and
 * real balance. `ledgerAccounts.retrieve` accepts the company id directly and resolves
 * its primary ledger. Used to decide whether to show the "activate payouts" prompt or
 * the live balance, so the dashboard never renders a bare "no payout account" state.
 */
export async function getPayoutSnapshot(companyId: string): Promise<PayoutSnapshot> {
  const ledger = await whopsdk.ledgerAccounts.retrieve(companyId);
  const balance = ledger.balances?.find((b) => b.currency === "usd") ?? ledger.balances?.[0];
  const status = ledger.payout_account_details?.status ?? null;
  return {
    activated: status === "connected",
    status,
    availableCents: Math.round((balance?.balance ?? 0) * 100),
    pendingCents: Math.round((balance?.pending_balance ?? 0) * 100),
  };
}

export interface CheckoutResult {
  sessionId: string;
  planId: string;
  purchaseUrl: string;
}

/**
 * Create a checkout configuration as a direct charge on a creator's connected
 * company, collecting our platform application fee. Returns the session + plan id
 * for the embedded checkout component.
 */
export async function createCheckoutConfiguration(params: {
  connectedCompanyId: string;
  amountCents: number;
  applicationFeeCents: number;
  planType: "one_time" | "renewal";
  title: string;
  redirectUrl: string;
  metadata: { kind: CheckoutKind } & Record<string, string>;
}): Promise<CheckoutResult> {
  const amount = centsToDollars(params.amountCents);
  const fee = centsToDollars(params.applicationFeeCents);

  const cfg = await whopsdk.checkoutConfigurations.create({
    plan: {
      company_id: params.connectedCompanyId,
      currency: "usd",
      plan_type: params.planType,
      application_fee_amount: fee,
      title: params.title,
      ...(params.planType === "renewal"
        ? { renewal_price: amount, billing_period: 30, initial_price: 0 }
        : { initial_price: amount }),
    },
    metadata: params.metadata,
    // Whop requires an https redirect URL; omit on http://localhost (the embed's
    // client-side returnUrl + onComplete handle the local success flow instead).
    ...(params.redirectUrl.startsWith("https://") ? { redirect_url: params.redirectUrl } : {}),
  });

  const planId = cfg.plan?.id;
  if (!planId) throw new Error("Checkout configuration did not return a plan id");

  return { sessionId: cfg.id, planId, purchaseUrl: cfg.purchase_url };
}

/** Look up a payment to confirm it succeeded (checkout-return fallback when no webhook). */
export async function retrievePayment(paymentId: string) {
  return whopsdk.payments.retrieve(paymentId);
}

/** Fire a push notification to a creator's connected company. Best-effort. */
export async function notifyCreator(params: {
  companyId: string;
  title: string;
  subtitle?: string;
  content: string;
  restPath?: string;
  iconUserId?: string;
}): Promise<boolean> {
  try {
    await whopsdk.notifications.create({
      company_id: params.companyId,
      title: params.title,
      subtitle: params.subtitle,
      content: params.content,
      rest_path: params.restPath,
      icon_user_id: params.iconUserId,
    });
    return true;
  } catch (err: unknown) {
    console.error("notifyCreator failed:", err);
    return false;
  }
}

/** Create the payments webhook pointing at our deployed endpoint. Returns the secret. */
export async function createPaymentsWebhook(appUrl: string): Promise<{ id: string; secret?: string }> {
  const res = await whopsdk.webhooks.create({
    url: `${appUrl}/api/webhooks/whop`,
    events: [
      "payment.succeeded",
      "payment.failed",
      "membership.activated",
      "membership.deactivated",
      "refund.created",
    ],
  } as Parameters<typeof whopsdk.webhooks.create>[0]);
  const anyRes = res as unknown as { id: string; webhook_secret?: string; secret?: string };
  return { id: anyRes.id, secret: anyRes.webhook_secret ?? anyRes.secret };
}
