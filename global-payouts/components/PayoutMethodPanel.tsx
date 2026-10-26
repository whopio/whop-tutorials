"use client";

import { useCallback, useEffect, useState } from "react";
import { AddPayoutMethodElement } from "@whop/embedded-components-react-js";
import { Button, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { formatArrival, formatMoney, type FormattedRail } from "@/lib/quotes";

type Blocked = {
  title: string;
  description: string;
  blockedCapabilities: string[];
};

type SavedMethod = {
  id: string;
  label: string;
  reference: string | null;
  currency: string;
  isDefault: boolean;
};

export function PayoutMethodPanel({
  ready,
  onMethodSaved,
  onLog,
}: {
  ready: boolean;
  onMethodSaved: (method: SavedMethod | null) => void;
  onLog: (kind: string, detail: string) => void;
}) {
  const [rails, setRails] = useState<FormattedRail[]>([]);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    onLog("GET", "/api/rails");

    try {
      const railsResponse = await fetch("/api/rails");
      if (railsResponse.ok) {
        const data = await railsResponse.json();
        setRails(data.rails ?? []);
        setBlocked(data.blocked ?? null);
        onLog("OK", `${(data.rails ?? []).length} ways to get paid`);
      }

      const methodsResponse = await fetch("/api/methods");
      if (methodsResponse.ok) {
        const data = await methodsResponse.json();
        setMethods(data.methods ?? []);
        onMethodSaved(data.methods?.[0] ?? null);
      }
    } finally {
      setBusy(false);
    }
  }, [onLog, onMethodSaved]);

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  return (
    <Panel
      annotationId="method"
      step={4}
      title="They pick how to get paid"
      blurb="Whop asks for whatever their bank needs. We did not write this form."
      aside={
        ready ? (
          <Button size="1" variant="soft" color="gray" onClick={refresh} disabled={busy}>
            {busy ? "Checking..." : "Check again"}
          </Button>
        ) : undefined
      }
    >
      {!ready ? (
        <Text size="2" color="gray" as="p">
          Create the account first and their options appear.
        </Text>
      ) : (
        <div className="flex flex-col gap-4">
          {blocked ? (
            <div className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] p-4">
              <Text size="2" weight="bold" as="div">
                {blocked.title}
              </Text>
              <Text size="2" color="gray" as="p" className="mt-1">
                {blocked.description}
              </Text>
              {blocked.blockedCapabilities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {blocked.blockedCapabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#6B6A66]"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              )}
              <Text size="1" color="gray" as="p" className="mt-3">
                Nothing is broken here. Whop told us exactly what is switched off and
                why, and step 3 is what switches it back on.
              </Text>
            </div>
          ) : (
            <div className="rounded-lg border border-[#E5E4E0] p-3">
              <AddPayoutMethodElement
                fallback={
                  <Text size="2" color="gray">
                    Loading the payout form...
                  </Text>
                }
              />
            </div>
          )}

          {methods.length > 0 && (
            <div>
              <Text size="2" weight="bold" as="div" className="mb-2">
                Saved
              </Text>
              {methods.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-[#E5E4E0] px-3 py-2"
                >
                  <Text size="2">{m.label}</Text>
                  <span className="font-mono text-[11px] text-[#6B6A66]">
                    {m.reference ?? m.currency.toUpperCase()}
                  </span>
                </div>
              ))}
              <Text size="1" color="gray" as="p" className="mt-2">
                We get an id and a masked label. The account number behind it stays
                with Whop.
              </Text>
            </div>
          )}

          {rails.length > 0 && <RailTable rails={rails} />}
        </div>
      )}
    </Panel>
  );
}

function RailTable({ rails }: { rails: FormattedRail[] }) {
  return (
    <div>
      <Text size="2" weight="bold" as="div" className="mb-2">
        What this seller can choose
      </Text>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-[#E5E4E0]">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#FAFAF9] text-[#6B6A66]">
            <tr>
              <th className="px-3 py-2 font-medium">Where</th>
              <th className="px-3 py-2 font-medium">Costs</th>
              <th className="px-3 py-2 font-medium">They get</th>
              <th className="px-3 py-2 font-medium">Lands</th>
            </tr>
          </thead>
          <tbody>
            {rails.map((rail) => (
              <tr
                key={rail.id}
                className={[
                  "border-t border-[#F1F1F0]",
                  rail.available ? "" : "text-[#9A9993]",
                ].join(" ")}
              >
                <td className="px-3 py-2">
                  {rail.name}
                  {rail.kind === "crypto" && (
                    <span className="ml-1.5 rounded bg-[#F1F1F0] px-1 py-0.5 text-[10px] text-[#6B6A66]">
                      crypto
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {rail.available ? `$${rail.fee?.toFixed(2)}` : rail.unavailableReason}
                </td>
                <td className="px-3 py-2">
                  {rail.available && rail.received !== null
                    ? formatMoney(rail.received, rail.currency)
                    : "-"}
                </td>
                <td className="px-3 py-2">
                  {rail.available ? formatArrival(rail.arrivesOn) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Text size="1" color="gray" as="p" className="mt-2">
        Same money out of our balance, a different amount landing. That is the rail,
        not us.
      </Text>
    </div>
  );
}
