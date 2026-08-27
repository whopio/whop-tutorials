import { getEnv } from "@/lib/env";
import { FormationExplainer } from "@/components/FormationExplainer";
import { FormationLab } from "@/components/FormationLab";
import { StepRail } from "@/components/StepRail";
import { WALKTHROUGH_STEPS } from "@/components/steps";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Read once so a broken environment fails here rather than inside a panel.
  // This also refuses to boot unless WHOP_SANDBOX is true.
  const env = getEnv();

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        <aside className="order-2 flex shrink-0 flex-col gap-5 lg:order-1 lg:sticky lg:top-8 lg:w-[380px]">
          <FormationExplainer />
          <StepRail steps={WALKTHROUGH_STEPS} startLabel="Show me" />
        </aside>

        <section className="order-1 min-w-0 flex-1 lg:order-2">
          <FormationLab accountId={env.WHOP_COMPANY_ID} />
        </section>
      </div>
    </main>
  );
}
