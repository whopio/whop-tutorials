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
        This demo shows how Whop&apos;s express checkout works, using test
        cards so no real money moves. It goes with the article on adding
        express checkout.
      </Text>

      <div className="flex flex-col gap-2.5">
        <div>
          <Text size="2" weight="bold" as="p">
            Wallets first, card form for everyone else
          </Text>
          <Text size="2" color="gray" as="p">
            The button shows Apple Pay, Google Pay, or PayPal when the visitor
            can use one. On this demo none show up, so everyone pays through
            Whop&apos;s card form.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Whop runs the checkout
          </Text>
          <Text size="2" color="gray" as="p">
            The checkout sits inside your page, and your code never touches
            card details. Whop can send the buyer back with the result in the
            address bar.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Trust the server, not the page
          </Text>
          <Text size="2" color="gray" as="p">
            The page only hears that a payment went through. The server checks
            with Whop before treating any payment as real.
          </Text>
        </div>
      </div>
    </div>
  );
}
