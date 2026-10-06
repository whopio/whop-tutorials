"use client";

import { useState } from "react";
import { Badge, Button, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import type { PromoSummary } from "@/lib/promo";

const STATUS_COLOR = {
  active: "green",
  inactive: "amber",
  archived: "gray",
} as const;

export function CodeTable({
  codes,
  selectedId,
  onSelect,
  onChanged,
  onEvent,
}: {
  codes: PromoSummary[];
  selectedId: string | null;
  onSelect: (code: PromoSummary) => void;
  onChanged: () => void;
  onEvent: (kind: string, detail: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(code: PromoSummary, action: "activate" | "deactivate") {
    setBusyId(code.id);
    try {
      await fetch(`/api/promo-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onEvent(`promoCodes.${action}`, code.code);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel
      step={6}
      id="manage"
      title="Your codes"
      meta={
        <Text size="1" color="gray">
          {codes.length ? `${codes.length} on Whop` : "none yet"}
        </Text>
      }
      footnote={
        <>
          Pause and resume are reversible, so they are safe to hand a stranger.
          Archiving is not, so this demo leaves it out. Pause calls{" "}
          <Code size="1" variant="soft">
            promoCodes.deactivate
          </Code>{" "}
          and resume calls{" "}
          <Code size="1" variant="soft">
            promoCodes.activate
          </Code>
          .
        </>
      }
    >
      {codes.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-1.5 rounded-lg border border-dashed border-[#D8D6D0] px-4 py-8">
          <Text size="2" weight="bold" as="p">
            No codes yet
          </Text>
          <Text size="1" color="gray" as="p">
            Run npm run setup to seed the three this demo offers.
          </Text>
        </div>
      ) : (
        <ul className="flex max-h-[19rem] flex-col gap-1.5 overflow-y-auto">
          {codes.map((code) => {
            const selected = code.id === selectedId;
            const exhausted =
              !code.unlimitedStock && code.stock > 0 && code.uses >= code.stock;
            const busy = busyId === code.id;

            return (
              <li
                key={code.id}
                className={[
                  "rounded-lg border transition-colors",
                  selected
                    ? "border-[#FA4616]/45 bg-[#FA4616]/[0.05]"
                    : "border-[#E5E4E0] bg-white hover:border-[#D8D6D0]",
                ].join(" ")}
              >
                {/* Two zones that never fight for width: an identity button
                    that truncates, and a fixed-width meta rail. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => onSelect(code)}
                    aria-pressed={selected}
                    className="flex min-w-0 flex-1 basis-40 items-center gap-2 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA4616]"
                  >
                    <Code size="1" variant={selected ? "solid" : "soft"} className="shrink-0">
                      {code.code}
                    </Code>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#151515]">
                      {code.label}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge color={STATUS_COLOR[code.status]} variant="soft" size="1">
                      {code.status}
                    </Badge>
                    <span
                      className={[
                        "whitespace-nowrap font-mono text-[11px]",
                        exhausted ? "text-[#CE2C31]" : "text-[#6B6A66]",
                      ].join(" ")}
                    >
                      {code.unlimitedStock
                        ? `${code.uses} used`
                        : `${code.uses}/${code.stock} used`}
                    </span>

                    {code.status !== "archived" && (
                      <div className="flex items-center">
                        <Button
                          type="button"
                          size="1"
                          variant="ghost"
                          color="gray"
                          disabled={busy}
                          onClick={() =>
                            void setStatus(
                              code,
                              code.status === "active" ? "deactivate" : "activate",
                            )
                          }
                        >
                          {code.status === "active" ? "Pause" : "Resume"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
