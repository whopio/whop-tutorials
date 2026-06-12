"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/fees";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { Button } from "@whop/react/components";
import { Check } from "@/components/Icons";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  benefits: string[];
  memberCount?: number;
};

export default function MembershipTiers({
  tiers,
  creatorUsername,
  creatorDisplayName,
  accentColor,
  sandbox,
  isLoggedIn,
}: {
  tiers: Tier[];
  creatorUsername: string;
  creatorDisplayName: string;
  accentColor: string;
  sandbox: boolean;
  isLoggedIn: boolean;
}) {
  const [activeTierId, setActiveTierId] = useState<string | null>(null);

  const body = useMemo(
    () => ({ kind: "membership", creatorUsername, tierId: activeTierId }),
    [creatorUsername, activeTierId],
  );

  function join(tierId: string) {
    if (!isLoggedIn) {
      window.location.href = `/api/auth/login?returnTo=/${creatorUsername}/membership`;
      return;
    }
    setActiveTierId(tierId);
  }

  return (
    <>
      <div className="space-y-4">
        {tiers.map((tier) => (
          <div key={tier.id} className="kofi-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  {formatUsd(tier.priceCents)}/mo
                </p>
                {typeof tier.memberCount === "number" ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {tier.memberCount} {tier.memberCount === 1 ? "member" : "members"}
                  </p>
                ) : null}
              </div>
              <Button onClick={() => join(tier.id)} size="2" variant="solid" className="shrink-0">
                Join
              </Button>
            </div>

            {tier.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{tier.description}</p>
            ) : null}

            {tier.benefits.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }}>
                      <Check className="h-4 w-4" />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <CheckoutModal
        open={activeTierId !== null}
        onClose={() => setActiveTierId(null)}
        body={body}
        creatorUsername={creatorUsername}
        creatorDisplayName={creatorDisplayName}
        accentColor={accentColor}
        sandbox={sandbox}
      />
    </>
  );
}
