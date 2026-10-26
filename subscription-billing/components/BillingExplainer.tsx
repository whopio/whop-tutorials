import { Heading, Text } from "@whop/react/components";

// Left-rail teaching copy. Static by design, the interactive proof lives in the panels.
export function BillingExplainer() {
  return (
    <div className="flex flex-col gap-3">
      <Heading size="6" as="h1">
        Subscription billing breakdown
      </Heading>
      <Text size="2" color="gray" as="p">
        Imagine you built this app. People pay $29 a month for its Pro membership. You&apos;ll try it
        as a subscriber, then look at the money as the owner. It all runs on the Whop sandbox, so
        the charges are real and the money is not.
      </Text>

      <div className="flex flex-col gap-2.5">
        <div>
          <Text size="2" weight="bold" as="p">
            Whop bills every month
          </Text>
          <Text size="2" color="gray" as="p">
            It charges the card, retries when a charge fails, and sends the receipt. No cron jobs.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            The membership is the subscription
          </Text>
          <Text size="2" color="gray" as="p">
            The app reads it from Whop to decide who gets in. This app stores nothing.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Subscribers manage it themselves
          </Text>
          <Text size="2" color="gray" as="p">
            Cancel, change their mind, or pause, without writing to you.
          </Text>
        </div>
      </div>
    </div>
  );
}
