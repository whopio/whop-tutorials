"use client";

import { Button, Code, Text } from "@whop/react/components";
import type { CheckoutCompletion } from "@/components/CheckoutModal";
import { Panel } from "@/components/Panel";
import type { PromoSummary } from "@/lib/promo";

// Step 3: the buyer types the code themselves. Both of Whop's checkouts ship
// the promo row, so there is nothing to build for it. What is worth seeing is
// how little the embedded checkout reports back: that a payment happened, not
// which code it used or what it was worth.
export function RedeemPanel({
  selected,
  completion,
  purchaseUrl,
  onOpenCheckout,
}: {
  selected: PromoSummary | null;
  completion: CheckoutCompletion | null;
  purchaseUrl: string;
  onOpenCheckout: () => void;
}) {
  return (
    <Panel
      step={3}
      id="redeem"
      title="Let someone use it"
      footnote={
        <>
          The hosted checkout finishes on whop.com, so a purchase made there
          never reaches this page. Use the embedded one to follow the payment
          through to step 5.
        </>
      }
    >
      <Text size="2" color="gray" as="p">
        Both checkouts have an <strong>Add promo code</strong> button. Type{" "}
        {selected ? (
          <Code size="1" variant="soft">
            {selected.code}
          </Code>
        ) : (
          "a code"
        )}{" "}
        there and pay with{" "}
        <Code size="1" variant="soft">
          4242 4242 4242 4242
        </Code>
        . On a narrow screen the embedded checkout folds the button under{" "}
        <strong>Promo code &amp; details</strong>.
      </Text>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" size="2" onClick={onOpenCheckout}>
          Embedded checkout
        </Button>
        <Button asChild size="2" variant="soft">
          <a href={purchaseUrl} target="_blank" rel="noopener noreferrer">
            Hosted checkout &#8599;
          </a>
        </Button>
      </div>

      <div className="flex flex-1 flex-col rounded-lg bg-[#F4F3F0] px-3 py-2.5">
        <span className="text-[11px] font-semibold text-[#6B6A66]">
          What the checkout told us
        </span>

        {completion ? (
          <>
            <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-[#151515]">
              {JSON.stringify(completion, null, 2)}
            </pre>
            <p className="mt-2.5 border-t border-[#E2E0DB] pt-2 text-[12px] leading-snug text-[#151515]">
              No code and no amount. The checkout says a payment happened, and
              the payment itself says what it was worth.
            </p>
          </>
        ) : (
          <div className="mt-1.5 flex flex-1 flex-col justify-center">
            <p className="text-[12px] leading-snug text-[#6B6A66]">
              Pay in the embedded checkout and{" "}
              <Code size="1" variant="soft">
                onComplete
              </Code>{" "}
              fires. Whatever it hands over lands here, unedited.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
