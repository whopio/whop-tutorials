"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

interface TrialCheckoutCardProps {
  planId: string;
  environment: "production" | "sandbox";
  returnUrl: string;
}

type Phase =
  | { name: "checkout" }
  | { name: "verifying" }
  | { name: "error"; message: string; receiptId?: string };

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

export function TrialCheckoutCard({
  planId,
  environment,
  returnUrl,
}: TrialCheckoutCardProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "checkout" });
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const verify = useCallback(
    async (receiptId: string) => {
      setPhase({ name: "verifying" });
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let res: Response;
        try {
          res = await fetch("/api/unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiptId }),
          });
        } catch {
          setPhase({
            name: "error",
            message: "We couldn't reach the server. Try again.",
            receiptId,
          });
          return;
        }
        if (cancelled.current) return;

        if (res.ok) {
          router.refresh();
          return;
        }

        if (res.status === 202 || res.status === 404) {
          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
          continue;
        }

        setPhase({
          name: "error",
          message:
            "We couldn't verify the checkout. Keep your receipt id and contact support if the trial doesn't appear.",
          receiptId,
        });
        return;
      }
      setPhase({
        name: "error",
        message: "The trial is taking longer than expected to confirm. Try again.",
        receiptId,
      });
    },
    [router],
  );

  if (phase.name === "verifying") {
    return <p>Starting your trial...</p>;
  }

  if (phase.name === "error") {
    return (
      <div>
        <p>{phase.message}</p>
        {phase.receiptId && (
          <button
            type="button"
            onClick={() => void verify(phase.receiptId as string)}
          >
            Retry verification
          </button>
        )}
      </div>
    );
  }

  return (
    <WhopCheckoutEmbed
      planId={planId}
      environment={environment}
      returnUrl={returnUrl}
      onComplete={(_planId, receiptId) => {
        if (!receiptId) {
          setPhase({
            name: "error",
            message:
              "The checkout didn't hand back a receipt. Check your email for it.",
          });
          return;
        }
        void verify(receiptId);
      }}
    />
  );
}
