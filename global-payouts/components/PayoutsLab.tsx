"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Text } from "@whop/react/components";
import { ActivityLog, logEntry, type ActivityEntry } from "@/components/ActivityLog";
import { Panel } from "@/components/Panel";
import { PayPanel } from "@/components/PayPanel";
import { PayoutMethodPanel } from "@/components/PayoutMethodPanel";
import { SellerPanel, type Seller } from "@/components/SellerPanel";
import { TrackPanel } from "@/components/TrackPanel";
import { PayoutsScope, VerifyPanel } from "@/components/VerifyPanel";
import { WhopElementsProvider } from "@/components/WhopElementsProvider";
import { DEMO_SALE_AMOUNT } from "@/constants/whop-ids";

export function PayoutsLab({
  sandbox,
  redirectUrl,
}: {
  sandbox: boolean;
  redirectUrl: string;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [funded, setFunded] = useState(false);
  const [paid, setPaid] = useState(false);

  const onLog = useCallback((kind: string, detail: string) => {
    setEntries((current) => [...current, logEntry(kind, detail)].slice(-40));
  }, []);

  const onMethodSaved = useCallback((method: { id: string } | null) => {
    setMethodId(method?.id ?? null);
  }, []);

  // A reload should not offer to create a second seller when this visitor
  // already has one waiting on the server.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/seller")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.sellerId) {
          setSeller({
            sellerId: data.sellerId,
            title: data.title,
            country: data.country,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function reset() {
    await fetch("/api/reset", { method: "POST" });
    setSeller(null);
    setMethodId(null);
    setFunded(false);
    setPaid(false);
    setEntries([]);
  }

  const panels = (
    <>
      <SellerPanel seller={seller} onCreated={setSeller} onLog={onLog} />
      <VerifyPanel ready={Boolean(seller)} />
      <PayoutMethodPanel
        ready={Boolean(seller)}
        onMethodSaved={onMethodSaved}
        onLog={onLog}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <Panel
        annotationId="story"
        step={1}
        title="Someone sold something"
        blurb={`A seller on our marketplace just made $${DEMO_SALE_AMOUNT}. They live in another country and we owe them the money.`}
      >
        <Text size="2" color="gray" as="p">
          Six steps from here to the money landing in their account. Nothing on this
          page is a mock up.
        </Text>
      </Panel>

      {seller ? (
        <WhopElementsProvider sandbox={sandbox}>
          <PayoutsScope sellerId={seller.sellerId} redirectUrl={redirectUrl}>
            {panels}
          </PayoutsScope>
        </WhopElementsProvider>
      ) : (
        panels
      )}

      <PayPanel
        ready={Boolean(methodId)}
        funded={funded}
        onFunded={() => setFunded(true)}
        onPaid={() => setPaid(true)}
        onLog={onLog}
      />

      <TrackPanel ready={paid} onLog={onLog} />

      <ActivityLog entries={entries} />

      <div className="flex justify-end">
        <Button size="1" variant="soft" color="gray" onClick={reset}>
          Start over
        </Button>
      </div>
    </div>
  );
}
