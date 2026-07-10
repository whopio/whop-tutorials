"use client";

import { useMemo } from "react";
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawButtonElement,
  WithdrawalsElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

/**
 * PAYOUTS-4/10: the embedded Whop payout portal — balance, withdraw, and
 * withdrawal history — scoped to the creator's connected account via a
 * short-lived token from /api/payout-token (refreshed on demand by the session).
 */
export function PayoutPortal({
  companyId,
  environment,
}: {
  companyId: string;
  environment: "sandbox" | "production";
}) {
  const elements = useMemo(() => loadWhopElements({ environment }), [environment]);
  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/studio/monetization`
      : "/studio/monetization";

  return (
    <Elements elements={elements}>
      <PayoutsSession
        token={async () => {
          const r = await fetch("/api/payout-token");
          if (!r.ok) throw new Error("Could not start a payout session.");
          const d = (await r.json()) as { token?: unknown };
          if (typeof d.token !== "string" || !d.token) {
            throw new Error("No payout token returned.");
          }
          return d.token;
        }}
        companyId={companyId}
        redirectUrl={redirectUrl}
      >
        <div className="flex flex-col gap-4">
          <BalanceElement
            fallback={<div className="text-sm text-fg-muted">Loading balance…</div>}
          />
          <WithdrawButtonElement fallback={<div />} />
          <WithdrawalsElement fallback={<div />} />
        </div>
      </PayoutsSession>
    </Elements>
  );
}
