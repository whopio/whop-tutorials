import { redirect } from "next/navigation";
import { ProgressionBar } from "@/components/progression-bar";
import { PlanSummaryCard } from "@/components/plan-summary-card";
import { TestCardHelper } from "@/components/test-card-helper";
import { WhopCheckout } from "./WhopCheckout";
import { PLANS, type PlanKey } from "@/lib/plans";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";

interface SearchParams {
  session?: string;
  plan?: string;
}

function isPlanKey(value: string | undefined): value is PlanKey {
  return value === "subscription" || value === "lifetime";
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const { session, plan } = await searchParams;

  if (!session || !isPlanKey(plan)) redirect("/");

  const planDef = PLANS[plan];

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-16 flex flex-col gap-10 animate-stagger">
      <ProgressionBar current="checkout" />

      <section className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-4xl">Complete your purchase</h1>
        <p className="text-base text-[color:var(--color-fg-muted)]">
          Secure checkout powered by Whop.
        </p>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8 items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <PlanSummaryCard
            name={planDef.name}
            price={planDef.price}
            priceSuffix={planDef.priceSuffix}
            features={[...planDef.features]}
          />
          <TestCardHelper />
        </div>
        <WhopCheckout
          sessionId={session}
          returnUrl={`${env.NEXT_PUBLIC_APP_URL}/checkout/complete`}
          sandbox={env.WHOP_SANDBOX}
        />
      </div>
    </div>
  );
}
