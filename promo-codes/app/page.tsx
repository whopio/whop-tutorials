import { WHOP_IDS } from "@/constants/whop-ids";
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
  searchParams: Promise<{ promo?: string }>;
}) {
  const env = getEnv();
  const session = await getSession();
  const { promo } = await searchParams;

  // Only the seeded set. Nothing on this page creates or destroys a code, so
  // the list is the same three for everyone who visits.
  const codes = await getSeededCodes();
  const codeNotes: Record<string, string> = Object.fromEntries(
    WHOP_IDS.promoCodes.map((promo) => [promo.id, promo.note]),
  );

  // A link can carry a code that no longer works. The checkout will not say
  // so, so we check before the buyer ever opens it.
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
            environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
            returnUrl={`${env.APP_URL}/`}
            initialCodes={codes}
            codeNotes={codeNotes}
            initialReceipt={initialReceipt}
            linkedCode={promo ?? null}
            linkVerdict={linkVerdict}
          />
        </section>
      </div>
    </main>
  );
}
