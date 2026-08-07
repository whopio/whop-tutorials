"use client";

import { useState } from "react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

type Stage =
  | { name: "idle" }
  | { name: "paying"; sessionId: string }
  | { name: "checking" }
  | { name: "done" }
  | { name: "failed"; message: string };

export function Checkout({
  environment,
  returnUrl,
}: {
  environment: "production" | "sandbox";
  returnUrl: string;
}) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });

  async function start() {
    const response = await fetch("/api/checkout", { method: "POST" });

    if (!response.ok) {
      setStage({ name: "failed", message: "We could not start the checkout." });
      return;
    }

    const { sessionId } = (await response.json()) as { sessionId: string };
    setStage({ name: "paying", sessionId });
  }

  async function confirm(receiptId: string) {
    setStage({ name: "checking" });

    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId }),
      });

      if (response.ok) {
        setStage({ name: "done" });
        return;
      }

      if (response.status !== 202) {
        setStage({ name: "failed", message: "We could not confirm that payment." });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setStage({ name: "failed", message: "Whop is taking longer than usual to confirm this." });
  }

  if (stage.name === "done") {
    return <p className="text-lg font-medium">Payment confirmed. Your Pro pass is active.</p>;
  }

  if (stage.name === "checking") {
    return <p className="text-neutral-600">Checking the payment with Whop.</p>;
  }

  if (stage.name === "paying") {
    return (
      <WhopCheckoutEmbed
        sessionId={stage.sessionId}
        environment={environment}
        returnUrl={returnUrl}
        theme="light"
        onComplete={(_planId, receiptId) => {
          if (receiptId) void confirm(receiptId);
        }}
        fallback={<p className="text-neutral-600">Loading the checkout.</p>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void start()}
        className="rounded-lg bg-neutral-900 px-5 py-3 font-medium text-white"
      >
        Buy
      </button>
      {stage.name === "failed" ? (
        <p className="text-sm text-red-600">{stage.message}</p>
      ) : null}
    </div>
  );
}
