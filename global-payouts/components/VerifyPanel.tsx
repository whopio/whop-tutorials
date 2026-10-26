"use client";

import { PayoutsSession, VerifyElement } from "@whop/embedded-components-react-js";
import { Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";

export function PayoutsScope({
  sellerId,
  redirectUrl,
  children,
}: {
  sellerId: string;
  redirectUrl: string;
  children: React.ReactNode;
}) {
  return (
    <PayoutsSession
      companyId={sellerId}
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
      step={3}
      title="They prove who they are"
      blurb="They send their ID straight to Whop. It never touches our servers."
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
          Create the account first and this form appears.
        </Text>
      )}

      <Text size="1" color="gray" as="p" className="mt-3">
        Everything in that box is drawn by Whop. We could not read it if we wanted to.
      </Text>
    </Panel>
  );
}
