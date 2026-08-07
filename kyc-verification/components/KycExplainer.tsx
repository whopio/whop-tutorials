import { Heading, Text } from "@whop/react/components";

export function KycExplainer() {
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-5 shadow-sm">
      <Heading size="5" className="mb-2">
        Identity verification breakdown
      </Heading>
      <Text size="2" color="gray" as="p">
        Whop will not pay a person or issue them a card until it knows who they are.
        Press start and this page runs that check for real.
      </Text>
      <Text size="2" as="p" className="mt-3">
        The thing to notice: their passport never reaches us.
      </Text>
      <Text size="1" color="gray" as="p" className="mt-3">
        Sandbox. Nothing here is a recording, and no real identity is checked.
      </Text>
    </div>
  );
}
