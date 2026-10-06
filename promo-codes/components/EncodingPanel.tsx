"use client";

import { Badge, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import type { PromoSummary } from "@/lib/promo";

// The one loud panel in the lab, because this is the one thing here that
// nothing else tells you: a percentage goes in whole and comes back as a
// fraction, so the number you send and the number you read are never the same
// number. Flat amounts pass through untouched, which is exactly what makes it
// easy to miss until a percentage code is already live.
export function EncodingPanel({ code }: { code: PromoSummary | null }) {
  const isPercent = code?.promoType === "percentage";

  return (
    <Panel
      step={2}
      id="encoding"
      title="What Whop hands back"
      hero
      meta={
        code ? (
          <Badge color={isPercent ? "orange" : "gray"} variant="soft" size="1">
            {code.promoType}
          </Badge>
        ) : undefined
      }
      footnote={
        code ? (
          <div className="flex flex-col gap-1.5">
            <span>
              {isPercent
                ? "Every read is the fraction: create, retrieve, list, and the checkout callback. Convert once, at the edge, and never store the result."
                : "Dollars go in and dollars come out. That is why the conversion has to branch on promo_type instead of running on every amount."}
            </span>
            <span className="block rounded-md bg-[#151515] px-2.5 py-2 font-mono text-[11px] leading-relaxed text-[#F1F1F1]">
              <span className="text-[#9A9993]">{"// lib/promo.ts"}</span>
              <br />
              {'promoType === "percentage" ? Math.round(raw * 100) : raw'}
            </span>
          </div>
        ) : undefined
      }
    >
      {!code ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-1.5 rounded-lg border border-dashed border-[#D8D6D0] px-4 py-8">
          <Text size="2" weight="bold" as="p">
            Make a code to see the catch
          </Text>
          <Text size="1" color="gray" as="p">
            The number you send and the number Whop returns land here, side by
            side.
          </Text>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="flex items-stretch gap-2.5">
            <Figure
              label="You send"
              sublabel={isPercent ? "whole percent" : "dollars"}
              value={code.displayAmount}
            />
            <div
              aria-hidden
              className="flex shrink-0 items-center text-2xl text-[#B6B5B0]"
            >
              &rarr;
            </div>
            <Figure
              label="Whop returns"
              sublabel={isPercent ? "decimal fraction" : "dollars, unchanged"}
              value={code.rawAmountOff}
              flagged={isPercent}
            />
          </div>

          {isPercent ? (
            <p className="text-[13px] leading-snug text-[#151515]">
              Print{" "}
              <Code size="1" variant="soft">
                {String(code.rawAmountOff)}
              </Code>{" "}
              straight from a list call and your page offers{" "}
              <strong>{code.rawAmountOff}% off</strong> where you meant{" "}
              <strong>{code.displayAmount}%</strong>. Send it back unchanged and
              the create is refused, because the write side floors at 1.
            </p>
          ) : (
            <p className="text-[13px] leading-snug text-[#151515]">
              A flat amount survives the round trip intact. Switch this code to a
              percentage and the two numbers stop matching.
            </p>
          )}

          {/* The rest of what came back. Whop is the record, so these are the
              stored values, not what the form happened to submit. */}
          <dl className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#E7E5E0] pt-3">
            <Stored label="Duration" value={code.duration ?? "not set"} />
            <Stored
              label="Uses left"
              value={
                code.unlimitedStock
                  ? "unlimited"
                  : `${Math.max(0, code.stock - code.uses)} of ${code.stock}`
              }
            />
            <Stored
              label="Per customer"
              value={code.onePerCustomer ? "once" : "no limit"}
            />
            <Stored
              label="Audience"
              value={code.newUsersOnly ? "new only" : "everyone"}
            />
          </dl>
        </div>
      )}
    </Panel>
  );
}

function Stored({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9A9993]">
        {label}
      </dt>
      <dd className="truncate font-mono text-[12px] text-[#151515]">{value}</dd>
    </div>
  );
}

function Figure({
  label,
  sublabel,
  value,
  flagged = false,
}: {
  label: string;
  sublabel: string;
  value: number;
  flagged?: boolean;
}) {
  return (
    <div
      className={[
        "flex min-w-0 flex-1 flex-col rounded-lg border px-3 py-2.5",
        flagged
          ? "border-[#FA4616]/45 bg-[#FA4616]/[0.06]"
          : "border-[#E5E4E0] bg-white",
      ].join(" ")}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9A9993]">
        {label}
      </span>
      <span
        className={[
          "mt-1 truncate font-mono text-[38px] leading-none tracking-tight",
          flagged ? "text-[#FA4616]" : "text-[#151515]",
        ].join(" ")}
      >
        {value}
      </span>
      <span className="mt-1 truncate text-[11px] text-[#6B6A66]">{sublabel}</span>
    </div>
  );
}
