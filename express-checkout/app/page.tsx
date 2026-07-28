import { WHOP_IDS } from "@/constants/whop-ids";
import { getEnv } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { StepRail } from "@/components/StepRail";
import { TeardownExplainer } from "@/components/TeardownExplainer";
import {
  TeardownLab,
  type ReceiptSummary,
  type ReturnParams,
} from "@/components/TeardownLab";
import { WALKTHROUGH_STEPS } from "@/components/steps";

export const dynamic = "force-dynamic";

async function summarize(
  paymentId: string | undefined,
): Promise<ReceiptSummary | null> {
  if (!paymentId) return null;
  try {
    const payment = await getWhop().payments.retrieve(paymentId);
    if (payment.status !== "paid") return null;
    return {
      id: payment.id,
      status: payment.status ?? "unknown",
      substatus: payment.substatus,
      total: payment.total ?? 0,
      currency: payment.currency ?? "usd",
      paidAt: payment.paid_at,
      cardBrand: payment.payment_method?.card?.brand ?? null,
      cardLast4: payment.payment_method?.card?.last4 ?? null,
    };
  } catch {
    return null;
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const env = getEnv();
  const whop = getWhop();
  const session = await getSession();
  const params = await searchParams;

  const plan = await whop.plans.retrieve(WHOP_IDS.planId);
  const productTitle = plan.product?.title ?? "Demo pass";
  const price = plan.initial_price ?? 5;

  const [initialCallback, initialRedirect] = await Promise.all([
    summarize(session.callbackPaymentId),
    summarize(session.redirectPaymentId),
  ]);

  // The express button appends the outcome to returnUrl when it completes
  // via redirect. Surface those params so step 4 can dissect them; the
  // client verifies the payment_id server-side (a route handler writes the
  // session; a server component render can't).
  const first = (v: string | string[] | undefined): string | null =>
    typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;
  const status = first(params.status);
  let returnParams: ReturnParams | null = null;
  if (status) {
    const search = new URLSearchParams();
    for (const key of ["status", "payment_id", "setup_intent_id", "state_id"]) {
      const value = first(params[key]);
      if (value) search.set(key, value);
    }
    returnParams = {
      status,
      paymentId: first(params.payment_id),
      setupIntentId: first(params.setup_intent_id),
      stateId: first(params.state_id),
      raw: search.toString(),
    };
  }

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        <aside className="order-2 flex shrink-0 flex-col gap-5 lg:order-1 lg:sticky lg:top-8 lg:w-[380px]">
          <TeardownExplainer />
          <StepRail steps={WALKTHROUGH_STEPS} />
          <ResetDemoButton />
        </aside>

        <section className="order-1 min-w-0 flex-1 lg:order-2">
          {/* Keyed by the held receipts so a reset remounts the walkthrough
              instead of leaving stale client state. */}
          <TeardownLab
            key={`${session.callbackPaymentId ?? "none"}:${session.redirectPaymentId ?? "none"}`}
            planId={WHOP_IDS.planId}
            productTitle={productTitle}
            price={price}
            initialCallback={initialCallback}
            initialRedirect={initialRedirect}
            returnParams={returnParams}
            environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
            returnUrl={`${env.APP_URL}/`}
          />
        </section>
      </div>
    </main>
  );
}
