"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { CheckoutPopup } from "./CheckoutPopup";

interface Props {
  open: boolean;
  onClose: () => void;
  promoCode?: string;
}

type CheckoutEnvironment = "sandbox" | "production";

interface CheckoutSession {
  sessionId: string;
  planId: string;
  environment: CheckoutEnvironment;
  returnUrl: string;
}

function PlusCheckoutInner({ onClose, promoCode }: { onClose: () => void; promoCode?: string }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/membership/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoCode }),
    })
      .then(async (r) => {
        const data = (await r.json()) as Partial<CheckoutSession> & { error?: string };
        if (cancelled) return;
        if (!r.ok || !data.sessionId || !data.planId || !data.environment || !data.returnUrl) {
          setError(data.error || "Could not start checkout.");
          return;
        }
        setCheckout({
          sessionId: data.sessionId,
          planId: data.planId,
          environment: data.environment,
          returnUrl: data.returnUrl,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not start checkout.");
      });
    return () => {
      cancelled = true;
    };
  }, [promoCode]);

  return (
    <CheckoutPopup title="Subscribe to Storyline" onClose={onClose}>
      {error ? (
        <div role="alert" className="p-6 text-sm text-error">
          {error}
        </div>
      ) : checkout ? (
        <WhopCheckoutEmbed
          planId={checkout.planId}
          sessionId={checkout.sessionId}
          returnUrl={checkout.returnUrl}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          themeOptions={{ accentColor: "green" }}
          environment={checkout.environment}
          styles={{ container: { paddingX: 16, paddingY: 8 } }}
          fallback={
            <div className="p-12 text-center text-text-secondary">Loading checkout…</div>
          }
          onComplete={() => {
            onClose();
            router.refresh();
          }}
        />
      ) : (
        <div className="p-12 text-center text-text-secondary">Preparing checkout…</div>
      )}
    </CheckoutPopup>
  );
}

// Wrapper: mount the inner component only when open so its state resets cleanly
// each time the popup opens — no need to manually reset state in a cleanup effect.
export function PlusCheckoutPopup({ open, onClose, promoCode }: Props) {
  if (!open) return null;
  return <PlusCheckoutInner onClose={onClose} promoCode={promoCode} />;
}
