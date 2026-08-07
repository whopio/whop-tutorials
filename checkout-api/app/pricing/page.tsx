import { Checkout } from "@/components/Checkout";
import { getEnv } from "@/lib/env";
import { WHOP_IDS } from "@/constants/whop-ids";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  const env = getEnv();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Pro pass</h1>
        <p className="mt-1 text-neutral-600">One payment, lifetime access.</p>
      </div>

      <p className="text-4xl font-semibold tabular-nums">
        ${WHOP_IDS.priceUsd.toFixed(2)}
      </p>

      <Checkout
        environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
        returnUrl={`${env.APP_URL}/pricing`}
      />
    </main>
  );
}
