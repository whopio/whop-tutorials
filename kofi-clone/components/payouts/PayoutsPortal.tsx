"use client";

import { useEffect, useRef, useState } from "react";
import {
  Elements,
  PayoutsSession,
  usePayoutsSession,
  StatusBannerElement,
  BalanceElement,
  WithdrawalsElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import { Button } from "@whop/react/components";
import { formatUsd } from "@/lib/fees";
import BrandIcon from "@/components/BrandIcon";

// Load the Whop Elements runtime once per environment. A sandbox access token must
// talk to the sandbox Elements API and a production token to production, so we pass
// the matching `environment` (the default, production, rejects a sandbox token).
const elementsByEnv: Partial<Record<"production" | "sandbox", ReturnType<typeof loadWhopElements>>> = {};
function getElements(environment: "production" | "sandbox") {
  return (elementsByEnv[environment] ??= loadWhopElements({ environment }));
}

type ThemeAccent = NonNullable<
  NonNullable<Parameters<typeof Elements>[0]["appearance"]>["theme"]
>["accentColor"];

type PortalProps = {
  companyId: string;
  accentColor: string;
  sandbox: boolean;
  earnedCents: number;
  activated: boolean;
  availableCents: number;
  pendingCents: number;
};

function Loading({ height }: { height: number }) {
  return (
    <div className="grid place-items-center text-sm text-muted" style={{ height }}>
      Loading…
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="kofi-card p-5">
      {title ? (
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

/** Headline balance, built from our own data so it is meaningful even when Whop's
 *  sandbox ledger is empty. Shows the live withdrawable balance once the account
 *  is verified on production. */
function BalanceSummary({
  earnedCents,
  activated,
  availableCents,
  pendingCents,
  sandbox,
}: {
  earnedCents: number;
  activated: boolean;
  availableCents: number;
  pendingCents: number;
  sandbox: boolean;
}) {
  return (
    <Card title="Balance">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold">{formatUsd(earnedCents)}</p>
          <p className="text-sm text-muted">Total earned from supporters</p>
        </div>
        {activated ? (
          <div className="text-right">
            <p className="text-lg font-semibold">{formatUsd(availableCents)}</p>
            <p className="text-xs text-muted">
              Available to withdraw{pendingCents > 0 ? ` · ${formatUsd(pendingCents)} pending` : ""}
            </p>
          </div>
        ) : null}
      </div>
      {sandbox ? (
        <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
          You&rsquo;re in sandbox mode, so your withdrawable Whop balance stays $0 even after a
          test payment. On production, settled payments appear here once your payout account is
          verified.
        </p>
      ) : null}
    </Card>
  );
}

/** "Activate payouts" CTA. Rendered inside <PayoutsSession> so it can open Whop's
 *  real identity-verification (KYC) modal via the session. */
function ActivatePayouts() {
  const session = usePayoutsSession();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2">
          <BrandIcon name="money" className="h-7 w-7" />
        </span>
        <div>
          <h3 className="font-bold">Activate payouts to withdraw</h3>
          <p className="mt-1 text-sm text-muted">
            Verify your identity and add a bank account or PayPal. It takes a few minutes, and you
            only do it once.
          </p>
        </div>
      </div>
      <Button
        onClick={() => session?.showVerifyModal({})}
        size="3"
        variant="solid"
        className="w-full shrink-0 sm:w-auto"
      >
        Activate payouts
      </Button>
    </div>
  );
}

/** The embedded Whop payout portal. Element sizing follows Whop's documented pattern
 *  (fixed-height, position:relative wrappers) so the iframes don't show scrollbars. */
function EmbeddedPortal({ companyId, accentColor, sandbox, activated }: {
  companyId: string;
  accentColor: string;
  sandbox: boolean;
  activated: boolean;
}) {
  const [dark, setDark] = useState(false);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the page's light/dark theme so the embedded elements re-theme when the
  // creator toggles it (the .dark class on <html> is flipped by ThemeToggle).
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // The Whop elements mount as iframes from the remote runtime. If none appear, they
  // failed to load (token, scopes, or environment) — show a refresh hint instead of
  // blank cards. The balance summary above still gives the creator their numbers.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!containerRef.current?.querySelector("iframe")) setFailed(true);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const elements = getElements(sandbox ? "sandbox" : "production");

  return (
    <Card title={activated ? "Withdraw" : "Payouts"}>
      {failed ? (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          We couldn&apos;t load the live payout portal. Refresh the page to try again.
        </p>
      ) : null}
      <div ref={containerRef} className={failed ? "hidden" : undefined}>
        <Elements
          elements={elements}
          appearance={{ theme: { appearance: dark ? "dark" : "light", accentColor: accentColor as ThemeAccent } }}
        >
          <PayoutsSession
            token={() =>
              fetch(`/api/payouts/token?companyId=${companyId}`)
                .then((r) => r.json())
                .then((d) => d.token as string)
            }
            companyId={companyId}
            currency="usd"
            redirectUrl={`${origin}/dashboard/payouts`}
          >
            <div className="grid gap-4">
              <StatusBannerElement fallback={<Loading height={0} />} style={{ width: "100%" }} />
              {activated ? (
                <>
                  <div style={{ position: "relative", width: "100%", height: "95.5px" }}>
                    <BalanceElement fallback={<Loading height={96} />} />
                  </div>
                  <WithdrawalsElement fallback={<Loading height={120} />} />
                </>
              ) : (
                <ActivatePayouts />
              )}
            </div>
          </PayoutsSession>
        </Elements>
      </div>
    </Card>
  );
}

export default function PayoutsPortal({
  companyId,
  accentColor,
  sandbox,
  earnedCents,
  activated,
  availableCents,
  pendingCents,
}: PortalProps) {
  return (
    <div className="grid gap-5">
      <BalanceSummary
        earnedCents={earnedCents}
        activated={activated}
        availableCents={availableCents}
        pendingCents={pendingCents}
        sandbox={sandbox}
      />
      <EmbeddedPortal companyId={companyId} accentColor={accentColor} sandbox={sandbox} activated={activated} />
    </div>
  );
}
