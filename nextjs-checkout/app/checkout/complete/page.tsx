import Link from "next/link";
import { Check, RefreshCcw, XCircle } from "lucide-react";
import { ProgressionBar } from "@/components/progression-bar";
import { ReceiptCard } from "@/components/receipt-card";
import { AccountCard } from "@/components/account-card";
import { UnlockedFeaturesCard } from "@/components/unlocked-features-card";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getWhop } from "@/lib/whop";
import { PRO_FEATURES } from "@/lib/plans";

interface SearchParams {
  status?: string;
  receipt_id?: string;
}

interface ReceiptData {
  plan: string;
  amount: number;
  type: "subscription" | "lifetime" | "unknown";
  date: Date;
  receiptId: string;
}

async function loadReceipt(receiptId: string): Promise<ReceiptData | null> {
  try {
    const whop = getWhop();
    const payment = await whop.payments.retrieve({ id: receiptId });
    // Payments are flat in SDK 2.x: plan_id instead of a nested plan, and
    // money fields are objects with a decimal string amount.
    const type: ReceiptData["type"] =
      payment.plan_id === env.NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID
        ? "subscription"
        : payment.plan_id === env.NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID
          ? "lifetime"
          : "unknown";
    return {
      plan:
        type === "subscription"
          ? "Pro Monthly"
          : type === "lifetime"
            ? "Pro Lifetime"
            : "Pro",
      amount: Number(payment.subtotal?.amount ?? 0),
      type,
      date: new Date(payment.created_at),
      receiptId,
    };
  } catch (err) {
    console.error("[complete] failed to load payment:", err);
    return null;
  }
}

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { status, receipt_id } = await searchParams;
  const isError = status === "error";

  const receipt = receipt_id ? await loadReceipt(receipt_id) : null;
  const waitingForWebhook = Boolean(receipt_id) && user.plan !== "pro";

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-16 flex flex-col gap-10 animate-stagger">
        <ProgressionBar current="checkout" />
        <section className="flex flex-col items-center text-center gap-4">
          <XCircle
            size={48}
            strokeWidth={1.5}
            className="text-[color:var(--color-accent-primary)]"
            aria-hidden="true"
          />
          <h1 className="font-serif text-4xl">
            Payment didn&rsquo;t go through
          </h1>
          <p className="text-base text-[color:var(--color-fg-muted)] max-w-md">
            Something went wrong while processing your payment. You haven&rsquo;t
            been charged. Give it another try.
          </p>
          <Link
            href="/"
            className="h-11 px-5 rounded-[var(--radius-sm)] bg-[color:var(--color-accent-primary)] hover:bg-[color:var(--color-accent-primary-hover)] text-[color:var(--color-accent-primary-fg)] font-semibold text-sm inline-flex items-center transition-colors"
          >
            Back to plans
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-8 pb-16 flex flex-col gap-10 animate-stagger">
      <ProgressionBar current="complete" />

      <section className="flex flex-col items-center text-center gap-4">
        <div
          className="h-14 w-14 rounded-full bg-[color:var(--color-accent-success)] flex items-center justify-center animate-fade"
          aria-hidden="true"
        >
          <Check size={28} strokeWidth={2} />
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl">You&rsquo;re on Pro</h1>
        <p className="text-base text-[color:var(--color-fg-muted)] max-w-md">
          Payment received. Your Pro access is being activated.
        </p>
      </section>

      <div className="flex flex-col gap-5">
        {receipt ? (
          <ReceiptCard {...receipt} />
        ) : (
          <section className="bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] p-6 text-sm text-[color:var(--color-fg-muted)]">
            Receipt unavailable. This is expected in sandbox if the payment
            record hasn&rsquo;t propagated yet.
          </section>
        )}
        <AccountCard
          plan={user.plan}
          planType={user.planType}
          updatedAt={user.planSince}
          waitingForWebhook={waitingForWebhook}
        />
        <UnlockedFeaturesCard
          features={[...PRO_FEATURES]}
          active={user.plan === "pro"}
          title="What you unlocked"
        />
      </div>

      <form
        action="/api/demo/reset"
        method="POST"
        className="flex flex-col items-center gap-2 pt-4 border-t border-[color:var(--color-border)]"
      >
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Want to run the flow again?
        </p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-fg-primary)] text-sm font-semibold hover:bg-[color:var(--color-surface-alt)] active:scale-[0.98] transition-all duration-150"
        >
          <RefreshCcw size={16} strokeWidth={1.75} aria-hidden="true" />
          Reset demo
        </button>
        <p className="text-xs text-[color:var(--color-fg-muted)] max-w-md text-center leading-relaxed">
          Sets your user back to the <span className="font-mono">free</span>{" "}
          plan and clears the session so you can try again with the same or a
          different email.
        </p>
      </form>
    </div>
  );
}
