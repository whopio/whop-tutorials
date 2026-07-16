import { Heading, Text } from "@whop/react/components";

// The left rail: plain-prose explanation of how Whop free trials work.
// Static teaching copy; the interactive walkthrough lives on the right.
export function TrialExplainer() {
  return (
    <div className="flex flex-col gap-4">
      <Heading size="6" style={{ fontFamily: "var(--font-acid)" }}>
        How free trials work with Whop
      </Heading>

      <Text size="2" color="gray" as="p">
        A trial unlocks the product now and defers the first charge. When it
        ends it converts to paid, or lapses if no card was taken.
      </Text>

      <Text size="2" color="gray" as="p">
        Access lives on Whop. The gate calls <code>users.checkAccess</code>{" "}
        every render, so it stays true while the membership is{" "}
        <code>trialing</code> and locks the instant it ends. No webhook, no flag
        to sync.
      </Text>

      <Text size="1" color="gray" as="p">
        Try it on the right, live on Whop&apos;s sandbox.
      </Text>
    </div>
  );
}
