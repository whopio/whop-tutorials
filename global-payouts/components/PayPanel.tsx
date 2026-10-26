"use client";

import { useState } from "react";
import { Button, Switch, Text } from "@whop/react/components";
import { Panel, Chip } from "@/components/Panel";
import { DEMO_PAYOUT_AMOUNT, DEMO_SALE_AMOUNT } from "@/constants/whop-ids";

type PayResult = {
  withdrawalId: string;
  status: string;
  amount: number;
  feeAmount: number;
};

export function PayPanel({
  ready,
  funded,
  onFunded,
  onPaid,
  onLog,
}: {
  ready: boolean;
  funded: boolean;
  onFunded: () => void;
  onPaid: (result: PayResult) => void;
  onLog: (kind: string, detail: string) => void;
}) {
  const [coversFees, setCoversFees] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PayResult | null>(null);
  const [secondId, setSecondId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fund() {
    setBusy(true);
    setError(null);
    onLog("POST", "/api/fund");

    try {
      const response = await fetch("/api/fund", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not move the money");
        return;
      }
      onFunded();
      onLog("OK", `$${data.amount} into the seller's balance`);
    } finally {
      setBusy(false);
    }
  }

  async function send(second = false) {
    setBusy(true);
    setError(null);
    onLog("POST", second ? "/api/pay (again)" : "/api/pay");

    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: DEMO_PAYOUT_AMOUNT,
          platformCoversFees: coversFees,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not send the payment");
        onLog("ERR", data.error ?? "pay failed");
        return;
      }

      if (second) {
        setSecondId(data.withdrawalId);
      } else {
        setResult(data);
        onPaid(data);
      }
      onLog("OK", data.withdrawalId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      annotationId="pay"
      step={5}
      title="We send the money"
      blurb="Getting money to a bank costs less than getting it to a crypto wallet. We choose who pays that."
      aside={result ? <Chip label="payment" value={result.withdrawalId} /> : undefined}
    >
      {!ready ? (
        <Text size="2" color="gray" as="p">
          They need a way to get paid before we can send anything.
        </Text>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-[#E5E4E0] px-3 py-2.5">
            <div className="min-w-0">
              <Text size="2" weight="bold" as="div">
                They made a sale
              </Text>
              <Text size="1" color="gray" as="p">
                We move ${DEMO_SALE_AMOUNT} into their balance so there is something
                to pay out.
              </Text>
            </div>
            <Button size="2" variant="soft" onClick={fund} disabled={funded || busy}>
              {funded ? "Done" : "Add the sale"}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#E5E4E0] px-3 py-2.5">
            <div className="min-w-0">
              <Text size="2" weight="bold" as="div">
                We cover the fee
              </Text>
              <Text size="1" color="gray" as="p">
                Off, and the fee comes out of what they receive.
              </Text>
            </div>
            <Switch
              checked={coversFees}
              onCheckedChange={setCoversFees}
              disabled={Boolean(result) || busy}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => send(false)} disabled={!funded || Boolean(result) || busy}>
              {busy && !result ? "Sending..." : `Send $${DEMO_PAYOUT_AMOUNT}`}
            </Button>
            {result && (
              <Button
                variant="soft"
                color="gray"
                onClick={() => send(true)}
                disabled={busy || Boolean(secondId)}
              >
                Send it again
              </Button>
            )}
          </div>

          {error && (
            <Text size="1" color="red" as="p">
              {error}
            </Text>
          )}

          {result && (
            <div className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] p-3">
              <Text size="2" as="div">
                Sent ${result.amount.toFixed(2)}. The fee was $
                {result.feeAmount.toFixed(2)} and{" "}
                {coversFees ? "we paid it" : "it came out of their money"}.
              </Text>
            </div>
          )}

          {secondId && (
            <div className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] p-3">
              <Text size="2" as="div">
                We sent that twice. Only one payment happened.
              </Text>
              <Text size="1" color="gray" as="p" className="mt-1">
                Both clicks came back with{" "}
                <span className="font-mono">{secondId}</span>.
              </Text>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
