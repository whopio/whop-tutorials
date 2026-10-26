import { Button, Text } from "@whop/react/components";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";
import { findSubscription, getCheckoutId, getPlan, hasAccess, isOngoing, type PlanInfo, type Subscription } from "@/lib/subscription";
import { listCharges, readReceipt, type Charge, type Receipt } from "@/lib/payments";
import { BillingExplainer } from "@/components/BillingExplainer";
import { StepRail } from "@/components/StepRail";
import { WALKTHROUGH_STEPS } from "@/components/steps";
import { AccountPanel } from "@/components/AccountPanel";
import { SubscribePanel } from "@/components/SubscribePanel";
import { ProAreaPanel } from "@/components/ProAreaPanel";
import { MySubscriptionPanel } from "@/components/MySubscriptionPanel";
import { ReceiptPanel } from "@/components/ReceiptPanel";
import { ChargesPanel } from "@/components/ChargesPanel";
import { ActivationPoller } from "@/components/ActivationPoller";

export const dynamic = "force-dynamic";

const SIGN_IN_ERRORS: Record<string, string> = {
  signin_failed: "Signing in with Whop did not finish. Try again.",
  signin_cancelled: "Sign-in was canceled on Whop. Try again when you're ready.",
  state_mismatch: "That sign-in link expired. Start again from the button.",
  email_required: "Whop did not share an email for that account, and the checkout needs one.",
};

// Each read stands alone, so one slow or failing call leaves the rest of the page working.
async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function lockedReason(signedIn: boolean, subscription: Subscription | null): string {
  if (!signedIn) return "Sign in and subscribe to open it.";
  if (!subscription) return "Subscribe to open it.";
  if (subscription.paused) return "Your subscription is paused.";
  if (isOngoing(subscription)) return "Your subscription needs attention.";
  return "Your subscription has ended.";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const env = getEnv();
  const session = await getSession();
  const { status, error } = await searchParams;
  const signedIn = Boolean(session.whopUserId);

  const [plan, checkoutId, subscription] = await Promise.all([
    settle<PlanInfo | null>(getPlan(), null),
    settle<string | null>(getCheckoutId(), null),
    session.whopUserId ? settle(findSubscription(session.whopUserId), null) : Promise.resolve(null),
  ]);

  let charges: Charge[] = [];
  let receipt: Receipt | null = null;
  if (subscription) {
    charges = await settle(listCharges(subscription.id), []);
    const latestPaid = charges.find((charge) => charge.status === "paid");
    if (latestPaid) receipt = await settle(readReceipt(latestPaid.id, subscription.id), null);
  }

  const unlocked = hasAccess(subscription);
  // Back from a successful checkout, but Whop has not listed the membership yet.
  // The configuration's redirect says "success", an off-site step says "succeeded".
  const activating = signedIn && (status === "success" || status === "succeeded") && !unlocked;

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        <aside className="flex shrink-0 flex-col gap-5 lg:sticky lg:top-8 lg:w-[380px]">
          <BillingExplainer />
          <StepRail steps={WALKTHROUGH_STEPS} />
          {signedIn && (
            <form action="/api/auth/logout" method="post" className="flex items-center justify-between gap-3">
              <Text size="1" color="gray">
                Signed in with Whop
              </Text>
              <Button type="submit" size="1" variant="soft" color="gray">
                Sign out
              </Button>
            </form>
          )}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          {error && SIGN_IN_ERRORS[error] && (
            <div className="rounded-xl border border-[#FA4616]/30 bg-white px-4 py-3">
              <Text size="2">{SIGN_IN_ERRORS[error]}</Text>
            </div>
          )}
          {activating && <ActivationPoller />}

          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <AccountPanel signedIn={signedIn} />
            <SubscribePanel
              signedIn={signedIn}
              plan={plan && checkoutId ? { id: plan.id, checkoutId, monthlyPrice: plan.monthlyPrice, dueToday: plan.dueToday } : null}
              buyerEmail={session.email ?? null}
              existing={isOngoing(subscription) ? (subscription?.paused ? "paused" : "active") : null}
              appUrl={env.APP_URL}
              sandbox={env.WHOP_SANDBOX}
            />
          </div>
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <ProAreaPanel unlocked={unlocked} reason={lockedReason(signedIn, subscription)} />
            <MySubscriptionPanel signedIn={signedIn} subscription={subscription} />
          </div>
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <ReceiptPanel signedIn={signedIn} receipt={receipt} />
            <ChargesPanel signedIn={signedIn} charges={charges} renewsAt={subscription && unlocked && !subscription.paused && !subscription.cancelAtPeriodEnd ? subscription.renewsAt : null} />
          </div>
        </section>
      </div>
    </main>
  );
}
