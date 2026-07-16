import { TrialCheckoutCard } from "@/components/TrialCheckoutCard";
import { getEnv } from "@/lib/env";
import { hasAccess } from "@/lib/paywall";

export default async function PremiumPage() {
  const env = getEnv();
  const unlocked = await hasAccess([env.WHOP_PRO_PRODUCT_ID]);

  return (
    <main>
      <h1>Pro workspace</h1>
      {unlocked ? (
        <section>
          <p>Everything you sell renders here, for members and trialers alike.</p>
        </section>
      ) : (
        <div>
          <p>Try everything free for 3 days. $10 a month after that.</p>
          <TrialCheckoutCard
            planId={env.WHOP_PRO_PLAN_ID}
            environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
            returnUrl={`${env.APP_URL}/premium`}
          />
        </div>
      )}
    </main>
  );
}
