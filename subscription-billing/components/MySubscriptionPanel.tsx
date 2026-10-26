"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Code, Text } from "@whop/react/components";
import type { Subscription, SubscriptionAction } from "@/lib/subscription";
import { Panel } from "@/components/Panel";
import { shortDate } from "@/components/format";

function statusOf(subscription: Subscription): { label: string; color: "green" | "orange" | "gray" | "red" } {
  if (subscription.paused) return { label: "Paused", color: "orange" };
  if (subscription.cancelAtPeriodEnd) return { label: "Ends at period end", color: "orange" };
  if (subscription.status === "active" || subscription.status === "trialing") return { label: "Active", color: "green" };
  if (subscription.status === "past_due") return { label: "Payment failed, retrying", color: "red" };
  return { label: "Ended", color: "gray" };
}

export function MySubscriptionPanel({
  signedIn,
  subscription,
}: {
  signedIn: boolean;
  subscription: Subscription | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<SubscriptionAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: SubscriptionAction) {
    setBusy(action);
    setError(null);
    const response = await fetch("/api/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Whop did not accept that change.");
      return;
    }
    router.refresh();
  }

  const button = (action: SubscriptionAction, label: string) => (
    <Button key={action} type="button" size="1" variant="soft" color="gray" disabled={busy !== null} onClick={() => void act(action)}>
      {busy === action ? "..." : label}
    </Button>
  );

  const live =
    subscription &&
    !["completed", "canceled", "expired"].includes(subscription.status);
  const status = subscription ? statusOf(subscription) : null;

  return (
    <Panel
      step={4}
      id="manage"
      title="Your subscription"
      meta={status ? <Badge color={status.color}>{status.label}</Badge> : null}
      footnote={
        <>
          <Code size="1">memberships.cancel</Code> with <Code size="1">cancel_at_period_end</Code>,{" "}
          <Code size="1">update</Code>, <Code size="1">pause</Code> and <Code size="1">resume</Code>, on
          the signed-in user&apos;s own membership only.
        </>
      }
    >
      {!signedIn && (
        <Text size="2" color="gray">
          Sign in first. Your subscription shows up here once you have one.
        </Text>
      )}
      {signedIn && !subscription && (
        <Text size="2" color="gray">
          No subscription yet. Subscribe to Pro and it appears here.
        </Text>
      )}
      {subscription && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 rounded-lg border border-[#EFEEEA] bg-[#FBFAF8] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <Text size="2" color="gray">
                {subscription.paused ? "Access until" : subscription.cancelAtPeriodEnd ? "Ends on" : "Renews on"}
              </Text>
              <Text size="2" weight="bold">
                {shortDate(subscription.renewsAt)}
              </Text>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Text size="2" color="gray">
                Membership
              </Text>
              <Code size="1" variant="ghost">
                {subscription.id}
              </Code>
            </div>
          </div>

          {live && (
            <div className="flex flex-wrap gap-1.5">
              {subscription.paused ? button("resume", "Resume") : button("pause", "Pause")}
              {subscription.cancelAtPeriodEnd
                ? button("keep", "Keep my subscription")
                : button("cancel_at_period_end", "Cancel at period end")}
            </div>
          )}

          {subscription.manageUrl && (
            <Text size="1" color="gray">
              Or manage it on Whop:{" "}
              <a href={subscription.manageUrl} target="_blank" rel="noreferrer" className="font-medium text-[#151515] underline">
                Whop&apos;s manage page
              </a>
            </Text>
          )}

          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}
        </div>
      )}
    </Panel>
  );
}
