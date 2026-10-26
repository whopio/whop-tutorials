import { WHOP_IDS } from "@/constants/whop-ids";
import { getCheckoutConfigurationId } from "@/lib/checkout";
import { getEnv } from "@/lib/env";
import { evaluateCode, getSeededCodes, type CodeVerdict } from "@/lib/promo";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { Lab, type PlanInfo } from "@/components/Lab";
import { PromoExplainer } from "@/components/PromoExplainer";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { StepRail } from "@/components/StepRail";
import { WALKTHROUGH_STEPS } from "@/components/steps";
import type { ReceiptSummary } from "@/components/CheckoutModal";
import { summarize } from "@/app/api/verify/route";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    promo?: string;
    payment?: string;
    payment_id?: string;
    status?: string;
  }>;
}) {
  const env = getEnv();
  const session = await getSession();
  const { promo, payment, payment_id, status } = await searchParams;

  // A checkout that has finished lands back here in one of two ways. The
  // configuration's redirect sends ?payment_id=pay_...&status=success after
  // every purchase, and a 3D Secure or bank step that leaves the page comes
  // back with ?payment=pay_...&status=succeeded|failed|canceled.
  const paymentId = payment_id ?? payment ?? null;
  const returned = status ? { paymentId, status } : null;

  // If Whop is unreachable the checkout still works with the plan alone, it
  // just cannot bring a new buyer back here afterwards.
  const checkoutConfigurationId = await getCheckoutConfigurationId().catch(() => null);

  // Only the seeded set. Nothing on this page creates or destroys a code, so
  // the list is the same three for everyone who visits.
  const codes = await getSeededCodes();
  const codeNotes: Record<string, string> = Object.fromEntries(
    WHOP_IDS.promoCodes.map((promo) => [promo.id, promo.note]),
  );

  // A link can carry a code that no longer works. The checkout would say so on
  // its promo row, but checking here lets the page say it first.
  let linkVerdict: CodeVerdict | null = null;
  if (promo) linkVerdict = await evaluateCode(promo);

  const planInfo: PlanInfo = {
    id: WHOP_IDS.planId,
    title: "Promo demo pass",
    price: WHOP_IDS.price,
  };

  // Rebuild the held receipt from Whop so a returning visitor's proof panel
  // reflects reality rather than whatever the client last remembered.
  let initialReceipt: ReceiptSummary | null = null;
  if (session.receiptId) {
    try {
      initialReceipt = await summarize(await getWhop().payments.retrieve({ id: session.receiptId }));
    } catch {
      // If the held receipt can't be read the panel starts clean.
    }
  }

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        <aside className="flex shrink-0 flex-col gap-5 lg:sticky lg:top-8 lg:w-[380px]">
          <PromoExplainer />
          <StepRail steps={WALKTHROUGH_STEPS} />
          <ResetDemoButton />
        </aside>

        <section className="min-w-0 flex-1">
          <Lab
            key={session.receiptId ?? "fresh"}
            plan={planInfo}
            appUrl={env.APP_URL}
            purchaseUrl={WHOP_IDS.purchaseUrl}
            checkoutConfigurationId={checkoutConfigurationId}
            environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
            initialCodes={codes}
            codeNotes={codeNotes}
            initialReceipt={initialReceipt}
            linkedCode={promo ?? null}
            linkVerdict={linkVerdict}
            returned={returned}
          />
        </section>
      </div>
    </main>
  );
}
