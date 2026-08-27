"use client";

import { useCallback, useState } from "react";
import { RosterPanel } from "@/components/RosterPanel";
import { TrackingPanel } from "@/components/TrackingPanel";
import { CompanyPanel } from "@/components/CompanyPanel";
import { FoundersPanel } from "@/components/FoundersPanel";
import { SendPanel } from "@/components/SendPanel";
import { ResultPanel } from "@/components/ResultPanel";
import { WallPanel } from "@/components/WallPanel";
import { DEFAULT_APPLICATION, SLOPPY_PATCH } from "@/constants/defaults";
import { ROSTER } from "@/constants/roster";
import type { Application } from "@/lib/formation/schema";
import type { PreflightResult } from "@/lib/formation/preflight";
import type { UncheckedFinding } from "@/lib/formation/unchecked";

interface PreflightResponse {
  accountId: string;
  result: PreflightResult;
  unchecked: UncheckedFinding[];
}

export function FormationLab({ accountId }: { accountId: string }) {
  const [app, setApp] = useState<Application>(DEFAULT_APPLICATION);
  const [selectedUser, setSelectedUser] = useState<string>(ROSTER[0].id);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [unchecked, setUnchecked] = useState<UncheckedFinding[]>([]);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editing anything clears the previous verdict, so a red field never refers
  // to a value the visitor has already changed.
  const update = useCallback((patch: Partial<Application>) => {
    setApp((current) => ({ ...current, ...patch }));
    setResult(null);
    setUnchecked([]);
    setTransportError(null);
  }, []);

  function makeSloppy() {
    const [first, ...rest] = app.founders;
    if (!first) return;
    update({
      founders: [
        {
          ...first,
          email: SLOPPY_PATCH.email,
          phone: SLOPPY_PATCH.phone,
          date_of_birth: SLOPPY_PATCH.date_of_birth,
          address: { ...first.address, postal_code: SLOPPY_PATCH.postal_code },
        },
        ...rest,
      ],
    });
  }

  async function send() {
    setBusy(true);
    setTransportError(null);

    try {
      const response = await fetch("/api/formation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : `The demo's own route answered ${response.status}.`;
        setTransportError(message);
        setResult(null);
        setUnchecked([]);
        return;
      }

      const body = data as PreflightResponse;
      setResult(body.result);
      setUnchecked(body.unchecked);
    } catch {
      setTransportError("The demo could not reach its own route. Check the console.");
    } finally {
      setBusy(false);
    }
  }

  const flagged = result?.outcome === "rejected" ? result.field : null;
  const user = ROSTER.find((row) => row.id === selectedUser) ?? ROSTER[0];

  return (
    <div className="flex flex-col gap-5">
      <RosterPanel selected={user.id} onSelect={setSelectedUser} accountId={accountId} />

      {/* A user who has already applied has nothing to fill in. You read their
          filing back instead, which is the other half of running the program. */}
      {user.status !== "none" ? (
        <TrackingPanel user={user} />
      ) : (
        <>
          <CompanyPanel app={app} update={update} flagged={flagged} />
          <FoundersPanel app={app} update={update} flagged={flagged} />
          <SendPanel
            app={app}
            accountId={accountId}
            busy={busy}
            onSend={send}
            onSloppy={makeSloppy}
          />
          <ResultPanel
            result={result}
            unchecked={unchecked}
            transportError={transportError}
          />
          <WallPanel reached={result?.outcome === "accepted"} />
        </>
      )}
    </div>
  );
}
