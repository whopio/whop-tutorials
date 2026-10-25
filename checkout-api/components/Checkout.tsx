"use client";

import { useEffect, useRef, useState } from "react";
import { loadWhop } from "@whop/elements";
import { Checkout as WhopCheckout, CheckoutElement, WhopElements } from "@whop/elements-react";

type Stage =
  | { name: "idle" }
  | { name: "paying"; checkoutId: string }
  | { name: "checking" }
  | { name: "done" }
  | { name: "failed"; message: string };

type Returned = { paymentId: string; status: string };

function firstStage(returned?: Returned): Stage {
  if (!returned) return { name: "idle" };

  if (returned.status === "failed" || returned.status === "canceled") {
    return { name: "failed", message: "That payment did not go through. You can try again." };
  }

  return { name: "checking" };
}

export function Checkout({
  environment,
  returnUrl,
  returned,
}: {
  environment: "production" | "sandbox";
  returnUrl: string;
  returned?: Returned;
}) {
  const [stage, setStage] = useState<Stage>(() => firstStage(returned));
  const confirming = useRef(false);

  useEffect(() => {
    if (returned && firstStage(returned).name === "checking") void confirm(returned.paymentId);
  }, [returned]);

  async function start() {
    const response = await fetch("/api/checkout", { method: "POST" });

    if (!response.ok) {
      setStage({ name: "failed", message: "We could not start the checkout." });
      return;
    }

    const { checkoutId } = (await response.json()) as { checkoutId: string };
    setStage({ name: "paying", checkoutId });
  }

  async function confirm(paymentId: string) {
    if (confirming.current) return;
    confirming.current = true;
    setStage({ name: "checking" });

    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        const response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });

        if (response.status === 200) {
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
    } finally {
      confirming.current = false;
    }
  }

  if (stage.name === "done") {
    return <p className="text-lg font-medium">Payment confirmed. Your Pro pass is active.</p>;
  }

  if (stage.name === "checking") {
    return <p className="text-neutral-600">Checking the payment with Whop.</p>;
  }

  if (stage.name === "paying") {
    return (
      <WhopElements elements={loadWhop()} environment={environment}>
        <WhopCheckout
          checkoutConfiguration={stage.checkoutId}
          returnUrl={returnUrl}
          onComplete={(completion) => {
            if (completion.result === "payment") void confirm(completion.paymentId);
          }}
          fallback={<p className="text-neutral-600">Loading the checkout.</p>}
        >
          <CheckoutElement />
        </WhopCheckout>
      </WhopElements>
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
