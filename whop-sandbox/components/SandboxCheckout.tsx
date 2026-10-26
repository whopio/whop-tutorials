"use client";

import { useCallback, useState } from "react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

type Status =
  | { name: "checkout" }
  | { name: "verifying"; receiptId: string }
  | { name: "paid"; receiptId: string; total: number; currency: string }
  | { name: "error"; message: string };

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

// The article's /test-lab checkout: the embed hands back a pay_ id, and
// /api/verify confirms it with payments.retrieve before the page trusts it.
export function SandboxCheckout({
  planId,
  environment,
  returnUrl,
}: {
  planId: string;
  environment: "production" | "sandbox";
  returnUrl: string;
}) {
  const [status, setStatus] = useState<Status>({ name: "checkout" });

  const verify = useCallback(async (receiptId: string) => {
    setStatus({ name: "verifying", receiptId });
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId }),
      }).catch(() => null);
      if (!res) break;

      // A 202 (still settling) and a 404 (not readable yet) both mean wait.
      if (res.status === 202 || res.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        continue;
      }
      if (res.status === 200) {
        const data = (await res.json()) as {
          receipt: { total: number; currency: string };
        };
        setStatus({
          name: "paid",
          receiptId,
          total: data.receipt.total,
          currency: data.receipt.currency,
        });
        return;
      }
      setStatus({ name: "error", message: `Whop didn't confirm ${receiptId}.` });
      return;
    }
    setStatus({ name: "error", message: `Couldn't confirm ${receiptId} yet.` });
  }, []);

  if (status.name === "checkout") {
    return (
      <WhopCheckoutEmbed
        planId={planId}
        environment={environment}
        returnUrl={returnUrl}
        onComplete={(_planId, receiptId) => {
          if (receiptId) void verify(receiptId);
          else setStatus({ name: "error", message: "No receipt came back." });
        }}
      />
    );
  }

  if (status.name === "verifying") {
    return <p>Confirming {status.receiptId} with Whop...</p>;
  }

  if (status.name === "paid") {
    return (
      <p>
        Payment confirmed: {status.receiptId}, ${status.total}{" "}
        {status.currency.toUpperCase()}.
      </p>
    );
  }

  return <p>{status.message}</p>;
}
