"use client";

import { useState } from "react";
import { Button, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { previewPrice } from "@/lib/promo";
import type { PromoSummary } from "@/lib/promo";

// Step 4: nobody types a code from an ad. The link carries it, and the checkout
// opens already discounted. On this page the code rides in on ?promo= and goes
// to the checkout's promoCode option. Whop's hosted checkout reads ?promoCode=
// straight off its own link, so that one needs no page at all.
export function LinkPanel({
  selected,
  appUrl,
  purchaseUrl,
  price,
  onOpenWithCode,
}: {
  selected: PromoSummary | null;
  appUrl: string;
  /** Whop's hosted checkout for the same plan. */
  purchaseUrl: string;
  price: number;
  onOpenWithCode: (code: string) => void;
}) {
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
          A code that no longer works still opens the checkout, at full price,
          and the checkout says why. Pause a code in step 6 and open its link to
          see it.
        </>
      }
    >
      {!selected ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-1.5 rounded-lg border border-dashed border-[#D8D6D0] px-4 py-8">
          <Text size="2" weight="bold" as="p">
            Pick a code to share
          </Text>
          <Text size="1" color="gray" as="p">
            Choose one from your codes and the shareable links build themselves
            here.
          </Text>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <LinkRow label="This page" url={`${appUrl}/?promo=${selected.code}`} />
            <LinkRow
              label="Hosted checkout"
              url={`${purchaseUrl}?promoCode=${selected.code}`}
            />
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
            {`<Checkout plan={planId} promoCode="${selected.code}">`}
            <br />
            {"  <CheckoutElement />"}
            <br />
            {"</Checkout>"}
          </div>
        </>
      )}
    </Panel>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#F4F3F0] px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9A9993]">
          {label}
        </span>
        {/* Wraps instead of truncating, because the code is at the end. */}
        <span className="break-all font-mono text-[11px] leading-snug text-[#151515]">
          {url}
        </span>
      </div>
      <button
        type="button"
        className="shrink-0 rounded px-1 text-[11px] font-semibold text-[#151515]/55 transition-colors hover:text-[#151515] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA4616]"
        onClick={() => {
          void navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
