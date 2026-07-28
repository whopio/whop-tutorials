import { Heading, Text } from "@whop/react/components";

// Left-rail teaching copy. Static by design; the interactive proof lives in
// the right column.
export function TeardownExplainer() {
  return (
    <div className="flex flex-col gap-3">
      <Heading size="6" as="h1">
        Express checkout breakdown
      </Heading>
      <Text size="2" color="gray" as="p">
        Whop&apos;s one-click checkout button, taken apart live on the test
        sandbox. Companion demo for the article on adding express checkout.
      </Text>

      <div className="flex flex-col gap-2.5">
        <div>
          <Text size="2" weight="bold" as="p">
            One button, three looks
          </Text>
          <Text size="2" color="gray" as="p">
            The button looks at your browser and shows Apple Pay, Google
            Pay, or a Whop Pay button. Your page never touches card details.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Two ways to finish
          </Text>
          <Text size="2" color="gray" as="p">
            A payment can finish in a popup while you stay on the page, or
            send the browser away and back with the result. This demo shows
            both.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Trust the server, not the page
          </Text>
          <Text size="2" color="gray" as="p">
            The page only sees a success message. The server double-checks
            with Whop before treating any payment as real.
          </Text>
        </div>
      </div>
    </div>
  );
}
