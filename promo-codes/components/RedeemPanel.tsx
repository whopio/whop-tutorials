"use client";

import type { WhopCheckoutPromoCode } from "@whop/checkout/react";
import { Badge, Button, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import type { PromoSummary } from "@/lib/promo";

// Step 3: the buyer types the code themselves. onPromoCodeChanged is the only
// signal your app gets that the checkout accepted one, and it is where the
// encoding from step 2 shows up a second time.
export function RedeemPanel({
  selected,
  applied,
  onOpenCheckout,
}: {
  selected: PromoSummary | null;
  applied: WhopCheckoutPromoCode | null;
  onOpenCheckout: () => void;
}) {
  return (
    <Panel
      step={3}
      id="redeem"
      title="Let someone use it"
      footnote={
        <>
          The callback also fires with{" "}
          <Code size="1" variant="soft">
            null
          </Code>{" "}
          when the buyer removes the code, so read it as the current state and
          not as a one-time event.
        </>
      }
    >
      <Text size="2" color="gray" as="p">
        Open the checkout and type{" "}
        {selected ? (
          <Code size="1" variant="soft">
            {selected.code}
          </Code>
        ) : (
          "a code"
        )}{" "}
        into the promo row. Pay with{" "}
        <Code size="1" variant="soft">
          4242 4242 4242 4242
        </Code>
        .
      </Text>

      <Button type="button" size="2" onClick={onOpenCheckout}>
        Open checkout
      </Button>

      <div className="flex flex-1 flex-col rounded-lg bg-[#F4F3F0] px-3 py-2.5">
        <span className="text-[11px] font-semibold text-[#6B6A66]">
          What the checkout told us
        </span>

        {applied ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Code size="1" variant="solid">
                {applied.code}
              </Code>
              <Badge color="green" variant="soft" size="1">
                {applied.type}
              </Badge>
              <span className="font-mono text-[15px] text-[#151515]">
                {applied.amount}
              </span>
            </div>
            {applied.type === "percentage" && (
              <p className="mt-2.5 border-t border-[#E2E0DB] pt-2 text-[12px] leading-snug text-[#151515]">
                The checkout above reads{" "}
                <strong>{Math.round(applied.amount * 100)}% off</strong> while
                the callback hands you{" "}
                <Code size="1" variant="soft">
                  {String(applied.amount)}
                </Code>
                . Print it raw and your page and the checkout disagree on the
                same screen.
              </p>
            )}
          </>
        ) : (
          <div className="mt-1.5 flex flex-1 flex-col justify-center">
            <p className="text-[12px] leading-snug text-[#6B6A66]">
              Apply a code inside the checkout and{" "}
              <Code size="1" variant="soft">
                onPromoCodeChanged
              </Code>{" "}
              fires. Whatever it hands over lands here, unedited.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
