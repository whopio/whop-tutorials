"use client";

import { useMemo } from "react";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  VerifyElement,
  WithdrawButtonElement,
  WithdrawalsElement,
  StatusBannerElement,
} from "@whop/embedded-components-react-js";

const environment =
  process.env.NEXT_PUBLIC_WHOP_ENV === "sandbox" ? "sandbox" : "production";

async function fetchPayoutToken(): Promise<string | null> {
  const res = await fetch("/api/payout-token");
  if (!res.ok) return null;
  const data = await res.json();
  return data.token ?? null;
}

export function PayoutPortal({ companyId }: { companyId: string }) {
  // loadWhopElements returns a promise that the Elements component accepts directly
  const elementsPromise = useMemo(
    () => loadWhopElements({ environment }),
    []
  );

  return (
    <Elements elements={elementsPromise}>
      <PayoutsSession
        companyId={companyId}
        token={fetchPayoutToken}
        currency="usd"
        redirectUrl={typeof window !== "undefined" ? window.location.href : "/dashboard"}
      >
        <div className="space-y-4">
          <StatusBannerElement />
          <VerifyElement />
          <BalanceElement />
          <WithdrawButtonElement />
          <WithdrawalsElement />
        </div>
      </PayoutsSession>
    </Elements>
  );
}
