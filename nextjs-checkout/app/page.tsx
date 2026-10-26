import { ProgressionBar } from "@/components/progression-bar";
import { PricingCard } from "@/components/pricing-card";
import { SignInPanel } from "@/components/sign-in-panel";
import { UnlockedFeaturesCard } from "@/components/unlocked-features-card";
import { getCurrentUser } from "@/lib/auth";
import { PLANS, PRO_FEATURES } from "@/lib/plans";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-16 flex flex-col gap-10 animate-stagger">
        <ProgressionBar current="plan" />
        <SignInPanel />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-16 flex flex-col gap-12 animate-stagger">
      <ProgressionBar current="plan" />

      <section className="flex flex-col gap-3 text-center">
        <h1 className="font-serif text-4xl sm:text-5xl">Upgrade to Pro</h1>
        <p className="text-base text-[color:var(--color-fg-muted)] max-w-lg mx-auto">
          Pick the plan that fits your team. You can switch later.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        <PricingCard {...PLANS.subscription} />
        <PricingCard {...PLANS.lifetime} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl text-center">What Pro includes</h2>
        <UnlockedFeaturesCard features={[...PRO_FEATURES]} active={false} />
      </section>
    </div>
  );
}
