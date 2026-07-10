"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Wallet } from "lucide-react";
import { enableMonetization } from "./actions";

export function MonetizationPanel({
  enrolled,
  whopCompanyId,
  payoutEnabled,
}: {
  enrolled: boolean;
  whopCompanyId: string | null;
  payoutEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (enrolled) {
    return (
      <div className="max-w-lg rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 font-medium text-green-500">
          <CheckCircle2 className="h-5 w-5" />
          Monetization enabled
        </div>
        <p className="mt-3 text-sm text-fg-muted">
          Connected account:{" "}
          <code className="rounded bg-hover px-1.5 py-0.5 text-fg">
            {whopCompanyId}
          </code>
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          {payoutEnabled
            ? "Payout-ready (KYC is skipped in Whop's sandbox)."
            : "Finish identity verification to receive payouts."}
        </p>
      </div>
    );
  }

  function onEnable() {
    setError(null);
    startTransition(async () => {
      const res = await enableMonetization();
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="max-w-lg rounded-2xl border border-border p-6">
      <Wallet className="h-8 w-8 text-accent" />
      <p className="mt-3 text-sm">
        Enable monetization to create your Whop connected account. Viewers can
        then join channel memberships and send Cheers; you withdraw your
        earnings (minus our platform fee) directly through Whop, as the merchant
        of record.
      </p>
      <button
        type="button"
        onClick={onEnable}
        disabled={pending}
        className="mt-5 rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Enabling…" : "Enable monetization"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      <p className="mt-5 text-xs text-fg-muted">
        Sandbox note: Whop's sandbox skips KYC. In production you'd be redirected
        to Whop's hosted identity verification here before your first payout.
      </p>
    </div>
  );
}
