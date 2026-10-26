"use client";

import { useCallback, useState } from "react";
import { Badge, Button, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { Modal } from "@/components/Modal";
import { MembershipCheckout } from "@/components/MembershipCheckout";
import { usd } from "@/components/format";

export interface PlanCard {
  id: string;
  checkoutId: string;
  monthlyPrice: number;
  dueToday: string;
}

const PERKS = ["Everything in the Pro area", "Billed monthly by Whop", "Cancel or pause any time"];

export function SubscribePanel({
  signedIn,
  plan,
  buyerEmail,
  existing,
  appUrl,
  sandbox,
}: {
  signedIn: boolean;
  plan: PlanCard | null;
  buyerEmail: string | null;
  // A subscription that hasn't ended. Paused counts, so nobody pays twice.
  existing: "active" | "paused" | null;
  appUrl: string;
  sandbox: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Panel
      step={2}
      id="subscribe"
      title="Subscribe to Pro"
      meta={existing ? <Badge color={existing === "paused" ? "orange" : "green"}>{existing === "paused" ? "Paused" : "Subscribed"}</Badge> : null}
      footnote={
        <>
          The checkout gets only the plan id and the user&apos;s email. The price lives on the Whop plan,
          so the browser can&apos;t change it.
        </>
      }
    >
      <div className="flex flex-col gap-3 rounded-lg border border-[#EFEEEA] bg-[#FBFAF8] p-4">
        <div className="flex items-baseline justify-between gap-3">
          <Text size="3" weight="bold">
            Pro membership
          </Text>
          <Text size="5" weight="bold">
            {plan ? usd(plan.monthlyPrice) : "—"}
            <Text size="2" color="gray" weight="regular">
              {" "}
              / month
            </Text>
          </Text>
        </div>
        <ul className="flex flex-col gap-1">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FA4616]" aria-hidden />
              <Text size="2" color="gray">
                {perk}
              </Text>
            </li>
          ))}
        </ul>
      </div>

      {existing === "paused" ? (
        <Text size="2" color="gray">
          Your subscription is paused. Resume it from Your subscription instead of paying again.
        </Text>
      ) : existing ? (
        <Text size="2" color="gray">
          You&apos;re subscribed. Manage it from Your subscription.
        </Text>
      ) : buyerEmail && plan ? (
        <div className="flex flex-col items-start gap-2">
          <Button type="button" size="2" onClick={() => setOpen(true)}>
            Subscribe for {usd(plan.monthlyPrice)} a month
          </Button>
          <Text size="1" color="gray">
            Test card <Code size="1">4242 4242 4242 4242</Code>, any future date, any CVC.
          </Text>
        </div>
      ) : signedIn ? (
        <Text size="2" color="gray">
          Sign out and back in, so the checkout can use your Whop email.
        </Text>
      ) : (
        <Text size="2" color="gray">
          Sign in first, so the subscription knows whose it is.
        </Text>
      )}

      {plan && buyerEmail && !existing && (
        <Modal open={open} onClose={close} title="Pro membership" subtitle={`${usd(plan.monthlyPrice)} a month, ${usd(plan.dueToday)} today`}>
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-[#FA4616]/30 bg-[#FFF6F2] px-3 py-2">
              <Text size="2">
                Test card <Code size="1">4242 4242 4242 4242</Code>, any future date, any CVC.{" "}
                <Code size="1">4000 0000 0000 0341</Code> subscribes but fails its renewal.
              </Text>
            </div>
            <MembershipCheckout
              checkoutId={plan.checkoutId}
              buyerEmail={buyerEmail}
              returnUrl={`${appUrl}/`}
              sandbox={sandbox}
              onPaid={close}
            />
          </div>
        </Modal>
      )}
    </Panel>
  );
}
