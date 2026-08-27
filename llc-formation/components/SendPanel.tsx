"use client";

import { useMemo } from "react";
import { Button, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { toRequestBody, type Application } from "@/lib/formation/schema";

export function SendPanel({
  app,
  accountId,
  busy,
  onSend,
  onSloppy,
}: {
  app: Application;
  accountId: string;
  busy: boolean;
  onSend: () => void;
  onSloppy: () => void;
}) {
  // The same builder the route uses, so what is on screen is what goes out.
  const body = useMemo(() => JSON.stringify(toRequestBody(app), null, 2), [app]);

  return (
    <Panel
      annotationId="send"
      step={4}
      title="The application"
      blurb="One call from your server, against your user's account. No draft to create first, no session to open."
    >
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-[#E5E4E0]">
          <div className="flex items-center gap-2 border-b border-[#E5E4E0] bg-[#FAFAF9] px-3 py-1.5">
            <span className="rounded bg-[#151515] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
              POST
            </span>
            <span className="truncate font-mono text-[11px] text-[#6B6A66]">
              /accounts/{accountId}/form_company
            </span>
          </div>
          <pre className="max-h-[280px] overflow-auto bg-white p-3 font-mono text-[11px] leading-[1.55] text-[#151515]">
            {body}
          </pre>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="3" disabled={busy} onClick={onSend}>
            {busy ? "Sending…" : "Send it to Whop →"}
          </Button>
          <Button
            type="button"
            size="3"
            variant="soft"
            color="gray"
            disabled={busy}
            onClick={onSloppy}
          >
            Fill it with junk instead
          </Button>
        </div>

        <Text size="1" color="gray" as="p">
          Junk means a broken email, a phone that is not E.164, a founder born in 2024,
          and a postal code of ZZZZZ. Whop takes all four.
        </Text>
      </div>
    </Panel>
  );
}
