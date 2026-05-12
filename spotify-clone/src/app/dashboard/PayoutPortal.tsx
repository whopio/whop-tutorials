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

interface PayoutPortalProps {
  companyId: string;
}

async function fetchPayoutToken(): Promise<string> {
  const res = await fetch("/api/payout-token");
  const data = await res.json();
  return data.token as string;
}

export function PayoutPortal({ companyId }: PayoutPortalProps) {
  const environment = process.env.NEXT_PUBLIC_WHOP_ENV as string | undefined;

  const whopElementsPromise = useMemo(
    () => loadWhopElements({ environment: environment as "production" | "sandbox" | undefined }),
    [environment]
  );

  const redirectUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Elements elements={whopElementsPromise}>
      <PayoutsSession
        companyId={companyId}
        token={fetchPayoutToken}
        currency="usd"
        redirectUrl={redirectUrl}
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
