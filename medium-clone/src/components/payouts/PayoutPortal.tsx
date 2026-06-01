"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ExternalLink, Loader2, Wallet } from "lucide-react";
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawElement,
  VerifyElement,
  AddPayoutMethodElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import { env } from "@/lib/env-public";

interface Props {
  companyId: string;
  kycComplete: boolean;
}

/**
 * Embedded Whop payout portal. Writers withdraw their tip + Partner Program
 * earnings without leaving Storyline. Token comes from /api/writers/payout-token
 * (server mints an accessTokens.create scoped to the writer's sub-company).
 */
export function PayoutPortal({ companyId, kycComplete }: Props) {
  const { resolvedTheme } = useTheme();
  const [hostedLoading, setHostedLoading] = useState(false);
  const [hostedError, setHostedError] = useState<string | null>(null);
  const [embeddedOpen, setEmbeddedOpen] = useState(false);
  const isSandbox = env.NEXT_PUBLIC_WHOP_SANDBOX === "true";

  // Load WhopElements once per mount. The Elements provider accepts a Promise.
  const elements = useMemo(
    () => loadWhopElements({ environment: isSandbox ? "sandbox" : "production" }),
    [isSandbox],
  );

  async function fetchToken(): Promise<string> {
    const res = await fetch(`/api/writers/payout-token?companyId=${companyId}`);
    if (!res.ok) throw new Error("Could not mint payout token");
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error("No token returned");
    return data.token;
  }

  async function openHostedPortal() {
    setHostedLoading(true);
    setHostedError(null);
    const res = await fetch("/api/writers/hosted-payout-link");
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    setHostedLoading(false);

    if (!res.ok || !data.url) {
      setHostedError(data.error ?? "Could not open hosted payout portal");
      return;
    }

    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-surface px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">Payout portal</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Open the hosted portal for withdrawals, or load the embedded portal here.
          </p>
          {hostedError && (
            <p role="alert" className="text-xs text-error mt-1">
              {hostedError}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={openHostedPortal}
            disabled={hostedLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-pill border border-border bg-background text-sm text-text-primary hover:border-text-primary disabled:opacity-60"
          >
            {hostedLoading ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <ExternalLink aria-hidden="true" className="size-4" />
            )}
            Open hosted portal
          </button>
          <button
            type="button"
            onClick={() => setEmbeddedOpen((v) => !v)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-pill border border-border bg-background text-sm text-text-primary hover:border-text-primary"
          >
            <Wallet aria-hidden="true" className="size-4" />
            {embeddedOpen ? "Hide embedded portal" : "Show embedded portal"}
          </button>
        </div>
      </div>

      {embeddedOpen && (
        <Elements
          elements={elements}
          appearance={{
            theme: {
              appearance: resolvedTheme === "dark" ? "dark" : "light",
              accentColor: "green",
            },
          }}
        >
          <PayoutsSession
            token={fetchToken}
            companyId={companyId}
            redirectUrl={`${env.NEXT_PUBLIC_APP_URL}/me/dashboard`}
          >
            {!kycComplete && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
                <p className="text-sm font-medium text-text-primary">Verify your identity</p>
                <p className="text-xs text-text-secondary mt-1">
                  Whop needs to verify you before you can withdraw funds.
                </p>
                <div className="mt-3">
                  <VerifyElement />
                </div>
              </div>
            )}

            <div className="rounded-md border border-border bg-background p-5">
              <BalanceElement />
            </div>

            <div className="rounded-md border border-border bg-background p-5">
              <h3 className="font-sans font-semibold text-sm text-text-secondary uppercase tracking-wider mb-3">
                Withdraw
              </h3>
              <WithdrawElement />
            </div>

            <div className="rounded-md border border-border bg-background p-5">
              <h3 className="font-sans font-semibold text-sm text-text-secondary uppercase tracking-wider mb-3">
                Payout method
              </h3>
              <AddPayoutMethodElement />
            </div>
          </PayoutsSession>
        </Elements>
      )}
    </div>
  );
}
