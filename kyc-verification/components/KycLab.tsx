"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@whop/react/components";
import { ActivityLog, logEntry, type ActivityEntry } from "@/components/ActivityLog";
import { KycExplainer } from "@/components/KycExplainer";
import { StartPanel } from "@/components/StartPanel";
import { StepsCard } from "@/components/StepsCard";
import { WatchPanel } from "@/components/WatchPanel";
import { FollowUpPanel } from "@/components/FollowUpPanel";
import { VerifiedPanel } from "@/components/VerifiedPanel";
import { VerifyPanel, VerifyScope } from "@/components/VerifyPanel";
import { WhopElementsProvider } from "@/components/WhopElementsProvider";
import type { VerifiedRecord } from "@/lib/verification-schema";

export function KycLab({
  sandbox,
  redirectUrl,
}: {
  sandbox: boolean;
  redirectUrl: string;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [record, setRecord] = useState<VerifiedRecord | null>(null);

  const onLog = useCallback((kind: string, detail: string) => {
    setEntries((current) => [...current, logEntry(kind, detail)].slice(-40));
  }, []);

  // The receiver cannot reach this visitor's cookie, so the page asks again
  // rather than being told. Every answer comes from the record itself.
  const refresh = useCallback(async () => {
    const response = await fetch("/api/verification");
    if (!response.ok) return;
    const data = await response.json();
    setRecord((data.record ?? null) as VerifiedRecord | null);
  }, []);

  // The account and the check both outlive a reload, because they live in the
  // visitor's cookie rather than in this component.
  useEffect(() => {
    void fetch("/api/demo/account")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.accountId) setAccountId(data.accountId);
      })
      .catch(() => undefined);
    void refresh();
  }, [refresh]);

  // Ask again only while there is something that can still change.
  const status = record?.status;
  useEffect(() => {
    if (!record) return;
    if (status === "approved" || status === "rejected") return;
    const timer = setInterval(() => void refresh(), 6000);
    return () => clearInterval(timer);
  }, [record, status, refresh]);

  async function reset() {
    await fetch("/api/reset", { method: "POST" });
    setAccountId(null);
    setRecord(null);
    setEntries([]);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
      <aside className="order-2 flex shrink-0 flex-col gap-5 lg:order-1 lg:sticky lg:top-8 lg:w-[380px]">
        <KycExplainer />
        <StepsCard record={record} accountId={accountId} />
      </aside>

      <section className="order-1 min-w-0 flex-1">
        <div className="flex flex-col gap-5">
          <StartPanel
            accountId={accountId}
            record={record}
            onAccountCreated={setAccountId}
            onStarted={() => void refresh()}
            onLog={onLog}
          />

          {accountId ? (
            <WhopElementsProvider sandbox={sandbox}>
              <VerifyScope accountId={accountId} redirectUrl={redirectUrl}>
                <VerifyPanel ready />
              </VerifyScope>
            </WhopElementsProvider>
          ) : (
            <VerifyPanel ready={false} />
          )}

          <WatchPanel record={record} />

          <FollowUpPanel record={record} onAnswered={() => void refresh()} onLog={onLog} />

          <VerifiedPanel record={record} />

          <ActivityLog entries={entries} />

          <div className="flex justify-end">
            <Button size="1" variant="soft" color="gray" onClick={reset}>
              Start over
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
