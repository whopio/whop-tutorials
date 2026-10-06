"use client";

import { useCallback, useEffect, useState } from "react";
import type { WhopCheckoutPromoCode } from "@whop/checkout/react";
import { Badge, Button, Code, Text } from "@whop/react/components";
import { ActivityLog, logEntry, type ActivityEntry } from "@/components/ActivityLog";
import { CardStrip } from "@/components/CardStrip";
import { CheckoutModal, type ReceiptSummary } from "@/components/CheckoutModal";
import { CodeTable } from "@/components/CodeTable";
import { EncodingPanel } from "@/components/EncodingPanel";
import { LinkPanel } from "@/components/LinkPanel";
import { ProofPanel } from "@/components/ProofPanel";
import { PromoPicker } from "@/components/PromoPicker";
import { RedeemPanel } from "@/components/RedeemPanel";
import type { CodeVerdict, PromoSummary } from "@/lib/promo";

export interface PlanInfo {
  id: string;
  title: string;
  price: number;
}

export function Lab({
  plan,
  appUrl,
  environment,
  returnUrl,
  initialCodes,
  codeNotes,
  initialReceipt,
  linkedCode,
  linkVerdict,
}: {
  plan: PlanInfo;
  appUrl: string;
  environment: "production" | "sandbox";
  returnUrl: string;
  initialCodes: PromoSummary[];
  /** Human blurbs for each seeded code, keyed by promo id. */
  codeNotes: Record<string, string>;
  initialReceipt: ReceiptSummary | null;
  /** Set when the page was opened through a ?promo= link. */
  linkedCode: string | null;
  /** Whether that link's code is actually worth applying. */
  linkVerdict: CodeVerdict | null;
}) {
  const [codes, setCodes] = useState(initialCodes);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCodes.find((c) => c.status === "active")?.id ?? null,
  );
  const [applied, setApplied] = useState<WhopCheckoutPromoCode | null>(null);
  const [receipt, setReceipt] = useState<ReceiptSummary | null>(initialReceipt);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [checkout, setCheckout] = useState<{ open: boolean; promoCode?: string }>({
    open: false,
  });

  const onEvent = useCallback((kind: string, detail: string) => {
    setEntries((prev) => [...prev, logEntry(kind, detail)].slice(-40));
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/promo-codes");
    if (!res.ok) return;
    const data = (await res.json()) as { codes: PromoSummary[] };
    setCodes(data.codes);
  }, []);

  // A ?promo= link should feel like the ad worked: say so, and preselect the
  // code it names so every panel below is talking about the same one.
  useEffect(() => {
    if (!linkedCode) return;
    onEvent("link", `arrived with ?promo=${linkedCode}`);
    const match = codes.find((c) => c.code === linkedCode.toLowerCase());
    if (match) setSelectedId(match.id);
    // Runs once for the arriving link, not on every code refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedCode]);

  const selected = codes.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#151515]">
            {plan.title}
          </span>
          <span className="shrink-0 font-mono text-[13px] text-[#6B6A66]">
            {`$${plan.price.toFixed(2)}`}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {selected && (
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9A9993]">
                Working with
              </span>
              <Code size="1" variant="soft">
                {selected.code}
              </Code>
            </span>
          )}
          <Badge
            color={environment === "sandbox" ? "orange" : "red"}
            variant="soft"
            size="1"
          >
            {environment}
          </Badge>
        </div>
      </div>

      {linkedCode && (
        <div
          className={[
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
            linkVerdict?.usable
              ? "border-[#FA4616]/40 bg-[#FA4616]/[0.05]"
              : "border-[#E5E4E0] bg-white",
          ].join(" ")}
        >
          <Text size="2" as="p">
            {linkVerdict?.usable
              ? `This page was opened with ?promo=${linkedCode}, so that is the code the checkout carries.`
              : `This link carries ?promo=${linkedCode}, and it will not work. ${linkVerdict?.reason ?? ""} The checkout would open at full price without mentioning it, so we checked first.`}
          </Text>
          <Button
            type="button"
            size="1"
            variant={linkVerdict?.usable ? "solid" : "soft"}
            color={linkVerdict?.usable ? undefined : "gray"}
            onClick={() => {
              setApplied(null);
              setCheckout({ open: true, promoCode: linkedCode });
            }}
          >
            {linkVerdict?.usable ? "Open it" : "Open it anyway"}
          </Button>
        </div>
      )}

      {/* Three independent rows, not two tall columns. Each row's cards
          stretch to the same height, so a short panel can never leave a
          column-length hole underneath it. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <PromoPicker
          codes={codes}
          selectedId={selectedId}
          price={plan.price}
          notes={codeNotes}
          onSelect={(code) => setSelectedId(code.id)}
        />
        <EncodingPanel code={selected} />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <RedeemPanel
          selected={selected}
          applied={applied}
          onOpenCheckout={() => {
            setApplied(null);
            setCheckout({ open: true });
          }}
        />
        <LinkPanel
          selected={selected}
          appUrl={appUrl}
          price={plan.price}
          onOpenWithCode={(code) => {
            setApplied(null);
            setCheckout({ open: true, promoCode: code });
          }}
        />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ProofPanel receipt={receipt} price={plan.price} />
        <CodeTable
          codes={codes}
          selectedId={selectedId}
          onSelect={(code) => setSelectedId(code.id)}
          onChanged={() => void refresh()}
          onEvent={onEvent}
        />
      </div>

      <ActivityLog entries={entries} />

      <CheckoutModal
        open={checkout.open}
        promoCode={checkout.promoCode}
        onClose={() => setCheckout({ open: false })}
        onVerified={(next) => {
          setReceipt(next);
          void refresh();
        }}
        onEvent={onEvent}
        onPromoChanged={setApplied}
        planId={plan.id}
        title={plan.title}
        priceLabel={
          checkout.promoCode
            ? `${checkout.promoCode} is already applied`
            : `$${plan.price.toFixed(2)}, before any code`
        }
        environment={environment}
        returnUrl={returnUrl}
        aboveEmbed={<CardStrip highlight="4242 4242 4242 4242" />}
      />
    </div>
  );
}
