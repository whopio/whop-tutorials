import { Heading, Text } from "@whop/react/components";

// Left-rail teaching copy. Static by design; the interactive proof lives in
// the right column.
export function SandboxExplainer() {
  return (
    <div className="flex flex-col gap-3">
      <Heading size="6" as="h1">
        Whop sandbox breakdown
      </Heading>
      <Text size="2" color="gray" as="p">
        A guided tour of the Whop sandbox, where you practice payments before
        any real money is involved. Everything on this page runs against the
        real sandbox with test cards.
      </Text>

      <div className="flex flex-col gap-2.5">
        <div>
          <Text size="2" weight="bold" as="p">
            A practice copy of Whop
          </Text>
          <Text size="2" color="gray" as="p">
            The sandbox works exactly like the real Whop. The only difference
            is that the data is separate and the money is fake.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Fake money, real behavior
          </Text>
          <Text size="2" color="gray" as="p">
            Each test card acts out a different outcome, a success, a decline,
            an extra bank check. So every way a payment can fail gets
            rehearsed before it happens for real.
          </Text>
        </div>
        <div>
          <Text size="2" weight="bold" as="p">
            Same code in production
          </Text>
          <Text size="2" color="gray" as="p">
            Going live is a two-line settings change, the code stays the same.
            Test products stay behind, so you create them again on the real
            Whop.
          </Text>
        </div>
      </div>
    </div>
  );
}
