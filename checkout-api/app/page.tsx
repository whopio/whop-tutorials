import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/env";
import { whop } from "@/lib/whop";
import { WHOP_IDS } from "@/constants/whop-ids";
import { CheckoutExplainer } from "@/components/CheckoutExplainer";
import { CheckoutLab, type PlanInfo } from "@/components/CheckoutLab";
import { StepRail } from "@/components/StepRail";
import { WALKTHROUGH_STEPS } from "@/components/steps";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = getEnv();
  const [plan, product] = await Promise.all([
    whop().plans.retrieve(WHOP_IDS.planId),
    whop().products.retrieve(WHOP_IDS.productId),
  ]);

  const planInfo: PlanInfo = {
    productId: product.id,
    productTitle: product.title,
    planId: plan.id,
    priceLabel: `$${plan.initial_price}`,
    planType: plan.plan_type,
  };

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        <aside className="order-2 flex shrink-0 flex-col gap-5 lg:order-1 lg:sticky lg:top-8 lg:w-[380px]">
          <CheckoutExplainer />
          <StepRail steps={WALKTHROUGH_STEPS} />
        </aside>

        <section className="order-1 min-w-0 flex-1 lg:order-2">
          <CheckoutLab
            plan={planInfo}
            environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
            returnUrl={`${env.APP_URL}/`}
            initialOrderId={`order-${randomUUID().slice(0, 8)}`}
          />
        </section>
      </div>
    </main>
  );
}
