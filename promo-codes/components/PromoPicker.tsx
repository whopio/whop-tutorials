"use client";

import { Badge, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { previewPrice } from "@/lib/promo";
import type { PromoSummary } from "@/lib/promo";

// Step 1. The demo does not create codes, it picks from three that were seeded
// once, because a promo code cannot be edited and archiving is permanent. The
// create call still has to be legible though, so the panel shows the exact
// promoCodes.create body that produced whichever code is selected.
export function PromoPicker({
  codes,
  selectedId,
  price,
  notes,
  onSelect,
}: {
  codes: PromoSummary[];
  selectedId: string | null;
  price: number;
  notes: Record<string, string>;
  onSelect: (code: PromoSummary) => void;
}) {
  const selected = codes.find((code) => code.id === selectedId) ?? null;

  return (
    <Panel
      step={1}
      id="create"
      title="Pick a discount"
      meta={
        <span className="font-mono text-[11px] text-[#6B6A66]">
          {`$${price.toFixed(2)} list`}
        </span>
      }
      footnote={
        <>
          Whop refuses a create that says nothing about stock, so one of{" "}
          <Code size="1" variant="soft">
            stock
          </Code>{" "}
          or{" "}
          <Code size="1" variant="soft">
            unlimited_stock
          </Code>{" "}
          is always in the body, even though both are documented as optional.
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {codes.map((code) => {
          const active = code.id === selectedId;
          const paused = code.status !== "active";
          return (
            <li key={code.id}>
              <button
                type="button"
                onClick={() => onSelect(code)}
                aria-pressed={active}
                className={[
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA4616]",
                  active
                    ? "border-[#FA4616]/45 bg-[#FA4616]/[0.05]"
                    : "border-[#E5E4E0] bg-white hover:border-[#D8D6D0]",
                ].join(" ")}
              >
                <span
                  className={[
                    "shrink-0 font-mono text-[18px] leading-none",
                    paused ? "text-[#9A9993]" : "text-[#151515]",
                  ].join(" ")}
                >
                  {code.promoType === "percentage"
                    ? `${code.displayAmount}%`
                    : `$${code.displayAmount}`}
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5">
                    <Code size="1" variant={active ? "solid" : "soft"}>
                      {code.code}
                    </Code>
                    {paused && (
                      <Badge color="amber" variant="soft" size="1">
                        paused
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 truncate text-[11px] text-[#6B6A66]">
                    {notes[code.id] ?? code.label}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[13px] text-[#151515]">
                    {`$${previewPrice(price, code.promoType, code.displayAmount).toFixed(2)}`}
                  </span>
                  <span className="block text-[10px] text-[#9A9993]">
                    they pay
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <details className="group rounded-lg border border-[#E5E4E0]">
          <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-[#151515]/65 transition-colors hover:text-[#151515] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#FA4616]">
            <span className="group-open:hidden">
              {`Show the call that made ${selected.code}`}
            </span>
            <span className="hidden group-open:inline">Hide the call</span>
          </summary>
          <pre className="overflow-x-auto rounded-b-lg bg-[#151515] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#F1F1F1]">
{`await whop.promoCodes.create(${JSON.stringify(
  {
    account_id: "biz_...",
    code: selected.code.toUpperCase(),
    promo_type: selected.promoType,
    // The write side takes whole percents. Read it back and you get 0.25.
    amount_off: selected.displayAmount,
    base_currency: "usd",
    new_users_only: selected.newUsersOnly,
    promo_duration_months: 1,
    unlimited_stock: selected.unlimitedStock,
    one_per_customer: selected.onePerCustomer,
    product_id: "prod_...",
  },
  null,
  2,
)})`}
          </pre>
        </details>
      )}

      {codes.length === 0 && (
        <Text size="1" color="gray" as="p">
          No codes are set up yet. Run{" "}
          <Code size="1" variant="soft">
            npm run setup
          </Code>{" "}
          to seed them.
        </Text>
      )}
    </Panel>
  );
}
