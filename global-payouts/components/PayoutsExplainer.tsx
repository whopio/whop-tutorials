import { Heading, Text } from "@whop/react/components";

export function PayoutsExplainer() {
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-5 shadow-sm">
      <Heading size="5" className="mb-2">
        Global payouts breakdown
      </Heading>
      <Text size="2" color="gray" as="p">
        A marketplace owes money to someone in another country. This page pays them
        for real, one step at a time.
      </Text>
      <Text size="2" as="p" className="mt-3">
        The thing to notice: their bank details never reach us.
      </Text>
      <Text size="1" color="gray" as="p" className="mt-3">
        Test mode. No real money moves.
      </Text>
    </div>
  );
}
