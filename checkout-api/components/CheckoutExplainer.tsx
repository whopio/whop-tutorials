import { Heading, Text } from "@whop/react/components";

export function CheckoutExplainer() {
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-4 shadow-sm sm:p-5">
      <Heading size="4" as="h1">
        Checkout API breakdown
      </Heading>
      <Text size="2" color="gray" as="p" className="mt-2">
        A sale has two sides. Whop knows about the money. Only we know which order the money
        was for. This page joins them up.
      </Text>
      <Text size="2" color="gray" as="p" className="mt-2">
        Running on Whop&apos;s test sandbox, so the card is fake and no money moves.
      </Text>
    </div>
  );
}
