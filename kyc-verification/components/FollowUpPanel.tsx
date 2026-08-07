"use client";

import { Text } from "@whop/react/components";
import { FollowUpForm } from "@/components/FollowUpForm";
import { Panel } from "@/components/Panel";
import type { VerifiedRecord } from "@/lib/verification-schema";

export function FollowUpPanel({
  record,
  onAnswered,
  onLog,
}: {
  record: VerifiedRecord | null;
  onAnswered: () => void;
  onLog: (kind: string, detail: string) => void;
}) {
  const items = record?.requestedInformation ?? [];

  return (
    <Panel
      annotationId="followup"
      step={4}
      title="The reviewer asks one more thing"
      blurb="The one screen in this flow we have to build ourselves."
    >
      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <Text size="1" color="gray" as="p">
            {items.length === 1
              ? "One question is open. The form below is built from it."
              : `${items.length} questions are open. The form below is built from them.`}
          </Text>
          <FollowUpForm items={items} onAnswered={onAnswered} onLog={onLog} />
        </div>
      ) : (
        <Text size="2" color="gray" as="p">
          Nothing has been asked. This appears only if a reviewer wants something else.
        </Text>
      )}
    </Panel>
  );
}
