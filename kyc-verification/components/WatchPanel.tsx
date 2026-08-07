"use client";

import { useEffect, useState } from "react";
import { Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import type { VerifiedRecord } from "@/lib/verification-schema";

type Capability = { name: string; state: string };
type RequiredAction = { action: string; title: string };

const TONE: Record<string, string> = {
  active: "text-[#2F855A]",
  pending: "text-[#B7791F]",
  inactive: "text-[#9A9993]",
  unknown: "text-[#B6B5B0]",
};

export function WatchPanel({ record }: { record: VerifiedRecord | null }) {
  const [capabilities, setCapabilities] = useState<Capability[] | null>(null);
  const [requiredActions, setRequiredActions] = useState<RequiredAction[] | null>(null);

  const status = record?.status;

  // Re-read the account whenever the record moves, because what verification
  // actually switches on lives there rather than on the verification.
  useEffect(() => {
    if (!record) return;
    void fetch("/api/demo/capabilities")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setCapabilities(data.capabilities);
        setRequiredActions(data.requiredActions);
      })
      .catch(() => undefined);
  }, [record, status]);

  return (
    <Panel
      annotationId="watch"
      step={3}
      title="Whop tells us the result"
      blurb="A webhook lands each time the record moves, and then we re-read it."
    >
      {record ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <Row label="started" value={record.createdAt} />
            <Row label="last moved" value={record.updatedAt ?? record.createdAt} />
            <Row label="status" value={record.status} />
          </div>

          {capabilities ? (
            <div className="rounded-lg bg-[#F1F1F0] p-3">
              <div className="mb-2 text-[10px] uppercase tracking-wide text-[#9A9993]">
                What this account can do now
              </div>
              <div className="flex flex-col gap-1">
                {capabilities.map((capability) => (
                  <div
                    key={capability.name}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="font-mono text-[11px] text-[#151515]">
                      {capability.name}
                    </span>
                    <span
                      className={`font-mono text-[11px] ${TONE[capability.state] ?? TONE.unknown}`}
                    >
                      {capability.state}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-[#E3E2DE] pt-2">
                <span className="font-mono text-[11px] text-[#151515]">
                  required_actions
                </span>
                <span className="font-mono text-[11px] text-[#151515]">
                  {requiredActions && requiredActions.length > 0
                    ? requiredActions.map((a) => a.action).join(", ")
                    : "none"}
                </span>
              </div>
            </div>
          ) : null}

          <Text size="1" color="gray" as="p">
            The webhook cannot reach this page directly, so the page asks again every few
            seconds and takes its answer from the record. Approval switches these
            capabilities on. It is not a promise that money will move.
          </Text>
        </div>
      ) : (
        <Text size="2" color="gray" as="p">
          Nothing has moved yet.
        </Text>
      )}
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#E3E2DE] py-2 last:border-0">
      <span className="text-xs text-[#9A9993]">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}
