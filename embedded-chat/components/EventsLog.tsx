"use client";

import { Text } from "@whop/react/components";

export type ActivityEntry = { kind: string; detail: string; at: string };

// Live activity feed: message sends, reactions, moderation changes and any
// events the embedded element emits.
export function EventsLog({ entries }: { entries: ActivityEntry[] }) {
  if (!entries.length) {
    return (
      <Text size="1" color="gray" as="p">
        Interactions show up here: messages you send, reactions, moderation
        changes, and events the chat element emits.
      </Text>
    );
  }
  return (
    <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
      {entries.map((e, i) => (
        <div key={i} className="flex items-baseline gap-2 text-xs">
          <span className="shrink-0 rounded bg-[#F1F1F0] px-1.5 py-0.5 font-mono text-[10px] text-[#6B6A66]">
            {e.kind}
          </span>
          <span className="min-w-0 truncate text-[#151515]">{e.detail}</span>
          <span className="ml-auto shrink-0 text-[10px] text-[#9A9993]">
            {e.at}
          </span>
        </div>
      ))}
    </div>
  );
}
