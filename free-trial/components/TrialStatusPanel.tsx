"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Text } from "@whop/react/components";
import { Countdown } from "@/components/Countdown";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { StepProgress } from "@/components/StepProgress";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function scopeHint(detail: string): boolean {
  return /permission|scope|403|not authorized|unauthorized/i.test(detail);
}

// Step 3: the trial is running. Shows the live countdown to the first
// charge plus the three real SDK controls (extend, end, reset).
export function TrialStatusPanel({
  username,
  status,
  renewalPeriodEnd,
  checkedAt,
}: {
  username?: string;
  status: string;
  renewalPeriodEnd: string | null;
  checkedAt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "extend" | "end">(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: "extend" | "end") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(
        action === "extend" ? "/api/extend-trial" : "/api/end-trial",
        { method: "POST" },
      );
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          data && typeof data === "object" && "detail" in data
            ? String((data as { detail: unknown }).detail)
            : "";
        const scope =
          action === "extend" ? "member:manage" : "membership:cancel";
        setError(
          scopeHint(detail)
            ? `The Company API key needs the ${scope} scope to ${action === "extend" ? "extend" : "end"} the trial. Add it in the Whop dashboard.`
            : `Couldn't ${action === "extend" ? "extend" : "end"} the trial. ${detail}`.trim(),
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const chargeDate = formatDate(renewalPeriodEnd);

  return (
    <div className="flex flex-col gap-5">
      <StepProgress current={3} />

      <div className="flex flex-col gap-4 rounded-xl border border-[#E5E4E0] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="green" variant="soft">
            Trial active
          </Badge>
          <Text size="2" weight="medium">
            @{username ?? "member"}
          </Text>
          <Badge color="gray" variant="soft">
            whop_session
          </Badge>
          <Badge color="green" variant="soft">
            ✓ checkAccess
          </Badge>
        </div>

        <div>
          <Text size="1" color="gray" as="div">
            {chargeDate ? "First charge in" : "Trial running"}
          </Text>
          <div className="mt-1">
            {renewalPeriodEnd ? (
              <Countdown target={renewalPeriodEnd} />
            ) : (
              <Text size="5" weight="bold">
                Free access, no scheduled charge
              </Text>
            )}
          </div>
          {chargeDate && (
            <div className="mt-1">
              <Text size="2" color="gray">
                Converts to $10/month on {chargeDate}.
              </Text>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            size="2"
            className="w-full"
            disabled={busy !== null}
            onClick={() => call("extend")}
          >
            {busy === "extend" ? "Extending..." : "Extend +3 days"}
          </Button>
          <Button
            type="button"
            size="2"
            variant="soft"
            color="red"
            className="w-full"
            disabled={busy !== null}
            onClick={() => call("end")}
          >
            {busy === "end" ? "Ending..." : "End trial now"}
          </Button>
          <ResetDemoButton />
        </div>

        {error && (
          <Text size="1" color="red" as="p">
            {error}
          </Text>
        )}

        <div>
          <Text size="1" color="gray">
            Access checked at {checkedAt} on the server, every render.
            Membership status: {status}.
          </Text>
        </div>
      </div>
    </div>
  );
}
