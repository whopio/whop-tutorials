import Link from "next/link";
import { ArrowRight, ShieldCheck, Tag, Wallet } from "lucide-react";
import { requireAuth, getSellerProfile } from "@/lib/auth";
import { BecomeSellerButton } from "@/components/BecomeSellerButton";

const benefits = [
  {
    icon: Wallet,
    title: "Keep 95% of every sale",
    body: "We take a 5% platform fee. Whop handles the rest, checkout, taxes, payouts.",
  },
  {
    icon: ShieldCheck,
    title: "Zero compliance work",
    body: "Whop handles KYC, tax forms, and international payouts. You just upload templates.",
  },
  {
    icon: Tag,
    title: "Run your own promotions",
    body: "Issue percentage or flat-amount discount codes scoped to your templates.",
  },
];

export default async function SellPage() {
  const user = await requireAuth();
  const seller = await getSellerProfile(user.id);

  if (seller) {
    return (
      <main className="relative isolate min-h-[calc(100vh-4rem-1px)] overflow-hidden">
        <div className="hero-mesh" aria-hidden>
          <span />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
            You&rsquo;re a seller on Stax
          </h1>
          <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
            Welcome back, <span className="font-semibold text-[var(--color-text-primary)]">@{seller.username}</span>.
          </p>
          <Link
            href="/sell/dashboard"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
          >
            Open seller dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate overflow-hidden">
      <div className="hero-mesh" aria-hidden>
        <span />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
            Sell your templates on Stax
          </h1>
          <p className="mt-5 text-lg text-[var(--color-text-secondary)]">
            One Whop account connects you to checkout, payouts, and KYC. Upload
            a template, set your price, publish, buyers get instant downloads
            and you get paid.
          </p>

          <div className="mt-8">
            <BecomeSellerButton isSandbox={process.env.WHOP_SANDBOX === "true"} />
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              We&rsquo;ll create a connected Whop account for you. In sandbox,
              KYC is auto-completed for testing.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-[var(--color-text-primary)]">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
