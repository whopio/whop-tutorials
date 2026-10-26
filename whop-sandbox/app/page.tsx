import { WHOP_IDS } from "@/constants/whop-ids";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { Lab, type PlanInfo } from "@/components/Lab";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { SandboxExplainer } from "@/components/SandboxExplainer";
import { StepRail } from "@/components/StepRail";
import { WALKTHROUGH_STEPS } from "@/components/steps";
import type { ReceiptSummary } from "@/components/CheckoutModal";
import type { EnvInfo } from "@/components/EnvBadge";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = getEnv();
  const whop = getWhop();
  const session = await getSession();

  const [plan, product] = await Promise.all([
    whop.variants.retrieve({ id: WHOP_IDS.planId }),
    whop.products.retrieve({ id: WHOP_IDS.productId }),
  ]);
  const planInfo: PlanInfo = {
    id: plan.id,
    productId: product.id,
    title: product.title,
    priceLabel: `$${plan.initial_price} one-time`,
    planType: plan.plan_type,
    purchaseUrl: plan.purchase_url,
  };

  // Rebuild the held receipt from Whop so a returning visitor's refund step
  // reflects reality (including refunds made from the dashboard).
  let initialReceipt: ReceiptSummary | null = null;
  let initialRefunded = false;
  if (session.receiptId) {
    try {
      const payment = await whop.payments.retrieve({ id: session.receiptId });
      const card = payment.payment_instrument?.card;
      initialReceipt = {
        id: payment.id,
        status: payment.status,
        substatus: payment.substatus,
        total: payment.total ? Number(payment.total.amount) : 0,
        currency: payment.currency,
        paidAt: payment.paid_at,
        cardBrand: card?.brand ?? null,
        cardLast4: card?.last4 ?? null,
        membershipId: payment.membership_id,
      };
      initialRefunded =
        payment.substatus.includes("refund") ||
        Number(payment.refunded_amount?.amount ?? 0) > 0;
    } catch {
      // If the held receipt can't be read the panels start clean.
    }
  }

  const environment = env.WHOP_SANDBOX ? "sandbox" : "production";
  const envInfo: EnvInfo = {
    sandbox: env.WHOP_SANDBOX,
    apiHost: env.WHOP_SANDBOX
      ? "sandbox-api.whop.com/api/v1"
      : "api.whop.com/api/v1",
    dashboardHost: env.WHOP_SANDBOX ? "sandbox.whop.com" : "whop.com",
    companyId: env.WHOP_COMPANY_ID,
    // Show only the key's type prefix; even partial key material stays off
    // a public page.
    maskedKey: `${env.WHOP_COMPANY_API_KEY.slice(0, 5)}${"•".repeat(16)}`,
  };

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        <aside className="order-2 flex shrink-0 flex-col gap-5 lg:order-1 lg:sticky lg:top-8 lg:w-[380px]">
          <SandboxExplainer />
          <StepRail steps={WALKTHROUGH_STEPS} />
          <ResetDemoButton />
        </aside>

        <section className="order-1 min-w-0 flex-1 lg:order-2">
          {/* Keyed by the held receipt so a reset (or a new session) remounts
              the client walkthrough instead of leaving stale panel state. */}
          <Lab
            key={session.receiptId ?? "fresh"}
            env={envInfo}
            plan={planInfo}
            initialReceipt={initialReceipt}
            initialRefunded={initialRefunded}
            environment={environment}
            returnUrl={`${env.APP_URL}/`}
            feedEnabled={Boolean(env.DATABASE_URL)}
          />
        </section>
      </div>
    </main>
  );
}
