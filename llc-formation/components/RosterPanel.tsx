"use client";

import { Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { ROSTER, STATUS_LABEL, type RosterUser } from "@/constants/roster";

const DOT: Record<RosterUser["status"], string> = {
  none: "bg-[#9A9993]",
  draft: "bg-[#D9A400]",
  processing: "bg-[#2E6FD9]",
  filed: "bg-[#2E6FD9]",
  completed: "bg-[#1A7F55]",
};

export function RosterPanel({
  selected,
  onSelect,
  accountId,
}: {
  selected: string;
  onSelect: (id: string) => void;
  accountId: string;
}) {
  const formed = ROSTER.filter((user) => user.status !== "none").length;

  return (
    <Panel
      annotationId="roster"
      step={1}
      title="Your users"
      blurb="Formation runs against an account, and on a platform every user has one. This is what the program looks like once it is running."
      aside={
        <span className="shrink-0 rounded-md bg-[#F1F1F0] px-2 py-1 font-mono text-[11px] text-[#151515]">
          {formed}/{ROSTER.length} registered
        </span>
      }
    >
      <div className="flex flex-col gap-2">
        {ROSTER.map((user) => {
          const active = user.id === selected;
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user.id)}
              className={[
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                active
                  ? "border-[#FA4616] bg-[#FFF8F5] shadow-sm"
                  : "border-[#E5E4E0] bg-white hover:border-[#FA4616]/40",
              ].join(" ")}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${DOT[user.status]}`}
                aria-hidden
              />

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <Text size="2" weight="medium" as="span">
                    {user.name}
                  </Text>
                  <span className="font-mono text-[11px] text-[#9A9993]">{user.handle}</span>
                </span>
                <Text size="1" color="gray" as="div" className="mt-0.5">
                  {user.legalName ?? user.joined}
                </Text>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-1">
                <Text size="1" color="gray" as="span">
                  {STATUS_LABEL[user.status]}
                </Text>
                {user.live ? (
                  <span className="rounded bg-[#FA4616] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Live
                  </span>
                ) : (
                  <span className="rounded bg-[#F1F1F0] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#9A9993]">
                    Example
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] p-3">
        <Text size="1" color="gray" as="p">
          You create each of these once, with a{" "}
          <Code size="1" variant="soft">
            POST /accounts
          </Code>{" "}
          when the user signs up. Forming a company is a second call against that id.
        </Text>
        <Text size="1" color="gray" as="p" className="mt-1.5">
          Marcus is the only live row. He maps to this demo&apos;s sandbox account{" "}
          <Code size="1" variant="soft">
            {accountId}
          </Code>{" "}
          and forming against him sends a real request.
        </Text>
        <Text size="1" color="gray" as="p" className="mt-1.5">
          Every stage after that begins when somebody pays $500, which the sandbox cannot
          do, so the other four are drawn from the documented shapes rather than live data.
        </Text>
      </div>
    </Panel>
  );
}
