import { unstable_cache } from "next/cache";
import { getWhop } from "@/lib/whop";
import { getEnv } from "@/lib/env";

export interface PlanInfo {
  id: string;
  monthlyPrice: number;
  billingDays: number;
  dueToday: string;
  hostedCheckoutUrl: string;
}

export interface Subscription {
  id: string;
  status: string;
  paused: boolean;
  cancelAtPeriodEnd: boolean;
  renewsAt: string | null;
  manageUrl: string | null;
}

export const ACTIONS = ["cancel_at_period_end", "keep", "pause", "resume"] as const;
const ENDED_STATUSES = new Set(["completed", "canceled", "expired"]);
export type SubscriptionAction = (typeof ACTIONS)[number];

// What a subscriber can use while their membership is in one of these states.
// "past_due" keeps access while Whop retries the card. Canceling at the end of the
// period and pausing both leave the status "active".
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

// The plan is made once, outside the app. Its price is read from Whop and
// cached for a few minutes, since the signed-out page shows it on every visit.
export const getPlan = unstable_cache(
  async (): Promise<PlanInfo> => {
    const plan = await getWhop().variants.retrieve({ id: getEnv().WHOP_PLAN_ID });
    return {
      id: plan.id,
      monthlyPrice: plan.renewal_price,
      billingDays: plan.billing_period ?? 30,
      dueToday: plan.initial_price_due.amount,
      hostedCheckoutUrl: plan.purchase_url,
    };
  },
  ["subscription-plan"],
  { revalidate: 300 },
);

let checkoutId: Promise<string> | null = null;

// The checkout configuration ties the plan to where Whop sends subscribers
// after they pay. Reuse the one that already points here, or make it once.
export function getCheckoutId(): Promise<string> {
  checkoutId ??= findOrCreateCheckout().catch((error: unknown) => {
    checkoutId = null;
    throw error;
  });
  return checkoutId;
}

async function findOrCreateCheckout(): Promise<string> {
  const { WHOP_PLAN_ID, APP_URL } = getEnv();
  const whop = getWhop();
  // Whop only redirects to https, so a local run ends on Whop's own page.
  const redirectUrl = APP_URL.startsWith("https://") ? `${APP_URL}/` : null;
  const plan = await whop.variants.retrieve({ id: WHOP_PLAN_ID });
  const accountId = plan.account?.id;
  if (!accountId) throw new Error("The plan has no account");
  for await (const checkout of await whop.checkoutConfigurations.list({ account_id: accountId, plan_id: WHOP_PLAN_ID })) {
    if (checkout.redirect_url === redirectUrl) return checkout.id;
  }
  const created = await whop.checkoutConfigurations.create({ plan_id: WHOP_PLAN_ID, redirect_url: redirectUrl });
  return created.id;
}

// The newest membership this user has on the plan, whatever its state.
// There is no database: Whop's membership is the subscription.
export async function findSubscription(whopUserId: string): Promise<Subscription | null> {
  const whop = getWhop();
  const filter = { user_id: whopUserId, plan_id: getEnv().WHOP_PLAN_ID };

  // A paused membership keeps its normal status in the list and only shows up
  // under status "paused", so ask for that separately.
  const paused = new Set<string>();
  for await (const membership of await whop.memberships.list({ ...filter, status: "paused" })) {
    paused.add(membership.id);
  }

  for await (const listed of await whop.memberships.list({ ...filter, order: "created_at", direction: "desc", first: 1 })) {
    // The list can trail a change by a few seconds. Reading the membership
    // itself gives its current state right after a cancel or an undo.
    const membership = await whop.memberships.retrieve({ id: listed.id });
    return {
      id: membership.id,
      status: membership.status,
      paused: paused.has(membership.id),
      cancelAtPeriodEnd: membership.cancel_at_period_end,
      renewsAt: membership.current_period_end,
      manageUrl: membership.manage_url,
    };
  }
  return null;
}

// Live or paused, as opposed to ended. A paused subscriber must not be offered
// the checkout again.
export function isOngoing(subscription: Subscription | null): boolean {
  return Boolean(subscription && !ENDED_STATUSES.has(subscription.status));
}

// A paused subscriber isn't charged again but keeps the period they already paid for.
export function hasAccess(subscription: Subscription | null): boolean {
  if (!subscription || !ACCESS_STATUSES.has(subscription.status)) return false;
  if (!subscription.paused) return true;
  return subscription.renewsAt !== null && new Date(subscription.renewsAt) > new Date();
}

// The membership is looked up from the session, never taken from the request,
// so a subscriber can only ever change their own.
export async function changeSubscription(whopUserId: string, action: SubscriptionAction): Promise<void> {
  const subscription = await findSubscription(whopUserId);
  if (!subscription) throw new Error("No subscription to change");

  const whop = getWhop();
  const id = subscription.id;
  switch (action) {
    case "cancel_at_period_end":
      // Leaving cancel_at_period_end out cancels right now, so it is always explicit.
      await whop.memberships.cancel({ id, cancel_at_period_end: true });
      return;
    case "keep":
      await whop.memberships.update({ id, cancel_at_period_end: false });
      return;
    case "pause":
      await whop.memberships.pause({ id });
      return;
    case "resume":
      await whop.memberships.resume({ id });
      return;
  }
}
