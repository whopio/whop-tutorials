"use client";

import { Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { VerifiedDetails } from "@/components/VerifiedDetails";
import type { VerifiedRecord } from "@/lib/verification-schema";

export function VerifiedPanel({ record }: { record: VerifiedRecord | null }) {
  const approved = record?.status === "approved";

  return (
    <Panel
      annotationId="verified"
      step={5}
      title="The verified details"
      blurb="Read back through a schema built to survive what a real record looks like."
    >
      {approved && record ? (
        <div className="flex flex-col gap-3">
          <VerifiedDetails record={record} />
          <Text size="1" color="gray" as="p">
            This unlocks the account&apos;s payout capabilities. It is not a promise that
            money will move, because the payouts side runs checks of its own after this
            one.
          </Text>
        </div>
      ) : (
        <Text size="2" color="gray" as="p">
          These appear once the check clears.
        </Text>
      )}
    </Panel>
  );
}
