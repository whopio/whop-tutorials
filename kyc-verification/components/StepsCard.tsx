"use client";

import type { VerifiedRecord } from "@/lib/verification-schema";

type StepState = "waiting" | "current" | "done" | "skipped";

const STEPS = [
  { id: "start", label: "We send what we know" },
  { id: "verify", label: "They prove who they are" },
  { id: "watch", label: "Whop tells us the result" },
  { id: "followup", label: "A reviewer asks for more" },
  { id: "verified", label: "We read the details back" },
] as const;

// Every state below comes from the record, never from where the visitor has
// clicked. An empty list of open questions is why step four is usually skipped
// rather than pending.
function stateOf(index: number, record: VerifiedRecord | null): StepState {
  const status = record?.status;
  const asking = (record?.requestedInformation.length ?? 0) > 0;
  const settled = status === "approved" || status === "rejected";

  if (!record) return index === 0 ? "current" : "waiting";

  switch (index) {
    case 0:
      return "done";
    case 1:
      return status === "pending" ? "current" : "done";
    case 2:
      if (status === "pending") return "waiting";
      return settled || status === "processing" || asking ? "done" : "current";
    case 3:
      if (asking) return "current";
      return settled ? "skipped" : "waiting";
    case 4:
      if (status === "approved") return "done";
      if (status === "rejected") return "skipped";
      return "waiting";
    default:
      return "waiting";
  }
}

const MARK: Record<StepState, { glyph: string; className: string }> = {
  done: { glyph: "✓", className: "bg-[#2F855A] text-white" },
  current: { glyph: "•", className: "bg-[#FA4616] text-white" },
  waiting: { glyph: "", className: "bg-[#E5E4E0] text-[#9A9993]" },
  skipped: { glyph: "–", className: "bg-[#F1F1F0] text-[#B6B5B0]" },
};

export function StepsCard({
  record,
  accountId,
}: {
  record: VerifiedRecord | null;
  accountId: string | null;
}) {
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-5 shadow-sm">
      <div className="mb-3 text-xs uppercase tracking-wide text-[#9A9993]">
        Where we are
      </div>

      <ol className="flex flex-col gap-2">
        {STEPS.map((step, index) => {
          const state = stateOf(index, record);
          const mark = MARK[state];
          return (
            <li key={step.id} className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${mark.className}`}
              >
                {mark.glyph || index + 1}
              </span>
              <span
                className={
                  state === "current"
                    ? "text-sm font-medium text-[#151515]"
                    : state === "waiting" || state === "skipped"
                      ? "text-sm text-[#9A9993]"
                      : "text-sm text-[#151515]"
                }
              >
                {step.label}
              </span>
              {state === "skipped" ? (
                <span className="ml-auto text-[10px] text-[#B6B5B0]">not needed</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {record || accountId ? (
        <div className="mt-4 flex flex-col gap-1 border-t border-[#E3E2DE] pt-3">
          {accountId ? <IdRow label="account" value={accountId} /> : null}
          {record ? <IdRow label="record" value={record.id} /> : null}
          {record ? <IdRow label="status" value={record.status} /> : null}
        </div>
      ) : (
        <p className="mt-4 border-t border-[#E3E2DE] pt-3 text-xs text-[#6B6A66]">
          This follows the real record, not the page.
        </p>
      )}
    </div>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wide text-[#9A9993]">{label}</span>
      <span className="font-mono text-[11px] text-[#151515]">{value}</span>
    </div>
  );
}
