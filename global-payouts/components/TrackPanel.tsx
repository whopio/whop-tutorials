"use client";

import { useEffect, useState } from "react";
import { Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";

type Payment = {
  status: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

// The three stops on the happy path. A payout can sit in review before it is
// processed, which still counts as the first stop. Anything else is the end of
// the road and arrives with a reason attached.
const TIMELINE = [
  { status: "requested", label: "We asked Whop to send it" },
  { status: "processing", label: "It is on its way to them" },
  { status: "completed", label: "It landed" },
] as const;

const TERMINAL = new Set(["failed", "canceled", "denied", "reversed"]);

export function TrackPanel({ ready, onLog }: { ready: boolean; onLog: (kind: string, detail: string) => void }) {
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch("/api/payment");
        if (response.ok && !cancelled) {
          const data = await response.json();
          setPayment((previous) => {
            if (data.status && data.status !== previous?.status) {
              onLog("EVENT", data.status);
            }
            return data;
          });
          if (data.status === "completed" || TERMINAL.has(data.status)) return;
        }
      } catch {
        // A dropped poll is not worth surfacing. The next one covers it.
      }
      if (!cancelled) timer = setTimeout(poll, 4000);
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, onLog]);

  const status = payment?.status ?? null;
  const reachedIndex = TIMELINE.findIndex(
    (s) => s.status === (status === "in_review" ? "requested" : status),
  );
  const failed = status ? TERMINAL.has(status) : false;

  return (
    <Panel
      annotationId="track"
      step={6}
      title="We follow it there"
      blurb="Whop tells us every time the payment moves. We just write down what it says."
    >
      {!ready ? (
        <Text size="2" color="gray" as="p">
          Send the payment and its progress shows up here.
        </Text>
      ) : (
        <div className="flex flex-col gap-3">
          {TIMELINE.map((stop, index) => {
            const done = reachedIndex >= index && reachedIndex !== -1;
            return (
              <div key={stop.status} className="flex items-center gap-3">
                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                    done ? "bg-[#FA4616] text-white" : "bg-[#E5E4E0] text-[#9A9993]",
                  ].join(" ")}
                >
                  {done ? "✓" : index + 1}
                </span>
                <Text size="2" color={done ? undefined : "gray"}>
                  {stop.label}
                </Text>
              </div>
            );
          })}

          {failed && (
            <div className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] p-3">
              <Text size="2" weight="bold" as="div">
                This one did not make it
              </Text>
              <Text size="2" color="gray" as="p" className="mt-1">
                {payment?.errorMessage ?? "Whop did not give a reason."}
              </Text>
            </div>
          )}

          <Text size="1" color="gray" as="p">
            Whop sends the same update more than once if it does not hear back, so we
            check whether we have seen it before acting on it.
          </Text>
        </div>
      )}
    </Panel>
  );
}
