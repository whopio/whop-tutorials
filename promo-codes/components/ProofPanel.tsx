"use client";

import { Badge, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import type { ReceiptSummary } from "@/components/CheckoutModal";

// Step 5: the only number that settles the argument. Everything before this is
// the checkout's opinion of the price. payments.retrieve is what was charged.
export function ProofPanel({
  receipt,
  price,
}: {
  receipt: ReceiptSummary | null;
  price: number;
}) {
  return (
    <Panel
      step={5}
      id="proof"
      title="What the receipt says"
      meta={
        receipt && receipt.saved > 0 ? (
          <Badge color="green" variant="solid" size="1">
            {`saved $${receipt.saved.toFixed(2)}`}
          </Badge>
        ) : undefined
      }
      footnote={
        receipt ? (
          <>
            All three numbers come off the payment itself. Note that the
            promo code arrives with the same fraction encoding as everywhere
            else, so a 25% code reads 0.25 here too.
          </>
        ) : (
          <>
            {`This product lists at $${price.toFixed(2)}. The payment itself records the price before the discount, what was charged, and which code did it.`}
          </>
        )
      }
    >
      {!receipt ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-1.5 rounded-lg border border-dashed border-[#D8D6D0] px-4 py-8">
          <Text size="2" weight="bold" as="p">
            Buy something to prove it
          </Text>
          <Text size="1" color="gray" as="p">
            Until the server reads the payment back, a discount is only a number
            on a screen.
          </Text>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-[#E5E4E0] px-3 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9A9993]">
                Before discount
              </span>
              <span className="font-mono text-[20px] leading-tight text-[#9A9993] line-through">
                {`$${receipt.before.toFixed(2)}`}
              </span>
            </div>
            <div aria-hidden className="text-xl text-[#B6B5B0]">
              &rarr;
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9A9993]">
                Actually charged
              </span>
              <span className="font-mono text-[28px] leading-tight text-[#151515]">
                {`$${receipt.paid.toFixed(2)}`}
              </span>
            </div>
          </div>

          {receipt.code && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E5E4E0] px-3 py-2">
              <span className="text-[11px] text-[#6B6A66]">Whop says the code was</span>
              <Code size="1" variant="solid">
                {receipt.code}
              </Code>
              <span className="text-[11px] text-[#6B6A66]">worth {receipt.discount}</span>
            </div>
          )}

          <div className="rounded-lg bg-[#151515] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#F1F1F1]">
            <span className="text-[#9A9993]">{"// app/api/verify/route.ts"}</span>
            <br />
            {`payment.subtotal      -> ${receipt.before}`}
            <br />
            {`payment.total         -> ${receipt.paid}`}
            <br />
            {`payment.promo_code_id -> ${receipt.promoCodeId ?? "null"}`}
          </div>
        </div>
      )}
    </Panel>
  );
}
