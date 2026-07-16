import { trialProduct } from "@/constants/products";
import { getEnv } from "@/lib/env";
import { hasAccess } from "@/lib/paywall";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { TrialExplainer } from "@/components/TrialExplainer";
import { TrialStatusPanel } from "@/components/TrialStatusPanel";
import { TrialWalkthrough } from "@/components/TrialWalkthrough";

export default async function Home() {
  const env = getEnv();
  const session = await getSession();

  // The trial is "running" when the visitor's session points at a membership
  // and Whop still grants the trial product (checkAccess re-runs every render,
  // so a cancelled/expired trial drops back to the walkthrough on its own).
  const granted =
    session.whopUserId && session.membershipId
      ? await hasAccess([trialProduct.productId])
      : false;

  let status = "";
  let renewalPeriodEnd: string | null = null;
  if (granted && session.membershipId) {
    try {
      const membership = await getWhop().memberships.retrieve(
        session.membershipId,
      );
      status = membership.status;
      renewalPeriodEnd = membership.renewal_period_end;
    } catch {
      // If the membership can't be read, fall through to the walkthrough.
    }
  }

  const trialActive =
    granted && ["trialing", "active", "completed"].includes(status);
  const checkedAt = new Date().toISOString().slice(11, 19) + " UTC";
  const environment = env.WHOP_SANDBOX ? "sandbox" : "production";
  const returnUrl = `${env.APP_URL}/`;

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        {/* Left: explanation */}
        <aside className="order-2 shrink-0 lg:order-1 lg:sticky lg:top-8 lg:w-[380px]">
          <TrialExplainer />
        </aside>

        {/* Right: interactive walkthrough */}
        <section className="order-1 min-w-0 flex-1 lg:order-2">
          {trialActive ? (
            <TrialStatusPanel
              username={session.username}
              status={status}
              renewalPeriodEnd={renewalPeriodEnd}
              checkedAt={checkedAt}
            />
          ) : (
            <TrialWalkthrough environment={environment} returnUrl={returnUrl} />
          )}
        </section>
      </div>
    </main>
  );
}
