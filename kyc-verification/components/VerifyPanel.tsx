"use client";

import type { ReactNode } from "react";
import { PayoutsSession, VerifyElement } from "@whop/embedded-components-react-js";
import { Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";

export function VerifyScope({
  accountId,
  redirectUrl,
  children,
}: {
  accountId: string;
  redirectUrl: string;
  children: ReactNode;
}) {
  return (
    <PayoutsSession
      companyId={accountId}
      redirectUrl={redirectUrl}
      token={() =>
        fetch("/api/token", { method: "POST" })
          .then((response) => response.json())
          .then((data) => data.token)
      }
    >
      {children}
    </PayoutsSession>
  );
}

export function VerifyPanel({ ready }: { ready: boolean }) {
  return (
    <Panel
      annotationId="verify"
      step={2}
      title="They prove who they are"
      blurb="Their documents go straight to Whop. They never touch our servers."
    >
      {ready ? (
        <div className="embed-crop-header rounded-lg border border-[#E5E4E0] p-3">
          <VerifyElement
            options={{ includeControls: false }}
            fallback={
              <Text size="2" color="gray">
                Loading the verification form...
              </Text>
            }
          />
        </div>
      ) : (
        <Text size="2" color="gray" as="p">
          Start a check above and Whop&apos;s own form appears here.
        </Text>
      )}

      <Text size="1" color="gray" as="p" className="mt-3">
        Everything in that box is drawn by Whop. We could not read it if we wanted to.
      </Text>
    </Panel>
  );
}
