"use client";

import { Text } from "@whop/react/components";

export interface ActivityEntry {
  kind: string;
  detail: string;
  at: string;
}

export function logEntry(kind: string, detail: string): ActivityEntry {
  return { kind, detail, at: new Date().toISOString().slice(11, 19) };
}

// Every call the demo makes, as it makes it. Client-side and ephemeral:
// refresh the page and it starts clean.
export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div
      className="rounded-xl border border-[#E5E4E0] bg-white p-4 shadow-sm"
      data-annotation-id="activity"
    >
      <div className="mb-2 flex items-center justify-between">
        <Text size="2" weight="bold">
          Activity log
        </Text>
        <Text size="1" color="gray">
          {entries.length ? `${entries.length} calls` : "live"}
        </Text>
      </div>
      {entries.length === 0 ? (
        <Text size="1" color="gray" as="p">
          Everything the page does behind the scenes shows up here.
        </Text>
      ) : (
        <div className="flex max-h-44 flex-col-reverse gap-1 overflow-y-auto">
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
      )}
    </div>
  );
}
