"use client";

import { useState } from "react";
import { Button, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { previewPrice } from "@/lib/promo";
import type { PromoSummary } from "@/lib/promo";

// Step 4: nobody types a code from an ad. The link carries it, the page reads
// it off the query string, and the checkout opens already discounted.
export function LinkPanel({
  selected,
  appUrl,
  price,
  onOpenWithCode,
}: {
  selected: PromoSummary | null;
  appUrl: string;
  price: number;
  onOpenWithCode: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = selected ? `${appUrl}/?promo=${selected.code}` : null;
  const discounted = selected
    ? previewPrice(price, selected.promoType, selected.displayAmount)
    : null;

  return (
    <Panel
      step={4}
      id="link"
      title="Put it in a link"
      footnote={
        <>
          A code that no longer works does not raise an error here. The checkout
          opens at full price with an empty promo row and the callback never
          fires, so check the code before you send people to it.
        </>
      }
    >
      {!selected ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-1.5 rounded-lg border border-dashed border-[#D8D6D0] px-4 py-8">
          <Text size="2" weight="bold" as="p">
            Pick a code to share
          </Text>
          <Text size="1" color="gray" as="p">
            Choose one from your codes and the shareable link builds itself
            here.
          </Text>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg bg-[#F4F3F0] px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#151515]">
              {shareUrl}
            </span>
            <button
              type="button"
              className="shrink-0 rounded px-1 text-[11px] font-semibold text-[#151515]/55 transition-colors hover:text-[#151515] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA4616]"
              onClick={() => {
                if (!shareUrl) return;
                void navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[#E5E4E0] px-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="font-mono text-[15px] text-[#9A9993] line-through">
                {`$${price.toFixed(2)}`}
              </span>
              <span aria-hidden className="text-[#B6B5B0]">
                &rarr;
              </span>
              <span className="font-mono text-[22px] leading-none text-[#151515]">
                {`$${(discounted ?? price).toFixed(2)}`}
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-[#6B6A66]">
              what they see first
            </span>
          </div>

          <Button
            type="button"
            size="2"
            variant="soft"
            onClick={() => onOpenWithCode(selected.code)}
          >
            {`Open checkout with ${selected.code} on`}
          </Button>

          <div className="mt-auto rounded-lg bg-[#151515] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#F1F1F1]">
            <span className="text-[#9A9993]">{"// the whole feature"}</span>
            <br />
            {"<WhopCheckoutEmbed"}
            <br />
            {"  planId={planId}"}
            <br />
            {`  promoCode="${selected.code}"`}
            <br />
            {"/>"}
          </div>
        </>
      )}
    </Panel>
  );
}
