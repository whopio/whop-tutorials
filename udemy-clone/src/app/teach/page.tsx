import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DollarSign, CreditCard, Wallet } from "lucide-react";
import { OnboardButton } from "@/components/onboard-button";

export default async function TeachPage() {
  const user = await requireAuth();
  if (!user) redirect("/sign-in");

  const profile = await getCreatorProfile(user.id);
  if (profile?.kycComplete) redirect("/teach/dashboard");

  return (
    <main className="max-w-3xl mx-auto px-8 py-28 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
        Share your expertise with the world
      </h1>
      <p className="text-lg text-[var(--color-text-secondary)] mb-14 max-w-xl mx-auto leading-relaxed">
        Create video courses, set your own price, and earn money from every student enrollment. We handle payments and payouts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
        {[
          { icon: DollarSign, title: "Set Your Price", desc: "You decide what your course is worth" },
          { icon: CreditCard, title: "We Handle Payments", desc: "Whop processes all transactions automatically" },
          { icon: Wallet, title: "Get Paid", desc: "Withdraw earnings to your bank account anytime" },
        ].map((item) => (
          <div key={item.title} className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center mx-auto mb-4">
              <item.icon className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        Platform takes a 20% commission — you keep 80% of every sale
      </p>

      <OnboardButton hasProfile={!!profile} />
    </main>
  );
}
