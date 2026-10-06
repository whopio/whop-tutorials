import { Heading, Text } from "@whop/react/components";

// Left-rail teaching copy. Static by design; the interactive proof lives in
// the right column.
export function PromoExplainer() {
  return (
    <div className="flex flex-col gap-3">
      <Heading size="6" as="h1">
        Promo code breakdown
      </Heading>
      <Text size="2" color="gray" as="p">
        A working tour of promo codes on Whop, from picking one to watching a
        buyer spend it. Everything here runs against the real sandbox, so the
        codes are real and the money is not.
      </Text>

      <div className="flex flex-col gap-2.5">
        <div>
          <Text size="2" weight="bold" as="p">
            Whop holds the codes
          </Text>
          <Text size="2" color="gray" as="p">
            You do not need a discounts table or redemption counters. The code,
            its limits, and how many times it has been used all live on Whop.
            This page reads them, it never keeps its own copy.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            The checkout does the math
          </Text>
          <Text size="2" color="gray" as="p">
            Your app never calculates a discounted price for real. It can
            preview one, but the amount that counts is the one on the receipt.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Two ways in
          </Text>
          <Text size="2" color="gray" as="p">
            A buyer can type a code at checkout, or your link can carry it in
            for them. Both end at the same place.
          </Text>
        </div>
      </div>
    </div>
  );
}
