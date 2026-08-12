"use client";

import { useCallback, useState } from "react";
import { Badge, Button, Code, Heading, Text } from "@whop/react/components";
import {
  ActivityLog,
  logEntry,
  type ActivityEntry,
} from "@/components/ActivityLog";
import { CardStrip, TEST_CARDS } from "@/components/CardStrip";
import {
  CheckoutModal,
  type ReceiptSummary,
} from "@/components/CheckoutModal";
import { EnvBadge, type EnvInfo } from "@/components/EnvBadge";
import { WebhookFeed } from "@/components/WebhookFeed";

export interface PlanInfo {
  id: string;
  productId: string;
  title: string;
  priceLabel: string;
  planType: string;
  purchaseUrl: string;
}

interface RefundSummary {
  id: string;
  status: string;
  substatus: string | null;
  refundedAmount: number;
  refundedAt: string | null;
  membershipStatus: string | null;
}

const REFUND_ERROR_COPY: Record<string, string> = {
  no_receipt: "Pay for the demo product in step 3 first, then come back to refund it.",
  wrong_product: "This receipt is for a different product.",
  already_refunded:
    "This payment is already refunded. Buy again in step 3 to try another round.",
  network: "Couldn't reach the server. Try again.",
};

function Panel({
  step,
  id,
  title,
  children,
}: {
  step: number;
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-annotation-id={id}
      className="rounded-xl border border-[#E5E4E0] bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E5E4E0] text-[11px] font-semibold text-[#151515]/70">
          {step}
        </span>
        <Heading size="3" as="h2">
          {title}
        </Heading>
      </div>
      {children}
    </section>
  );
}

// The interactive column: six panels in step order plus the activity log.
// All state a visitor accumulates lives here (and in the demo session
// cookie, which holds the receipt id for the refund step).
export function Lab({
  env,
  plan,
  initialReceipt,
  initialRefunded,
  environment,
  returnUrl,
  feedEnabled,
}: {
  env: EnvInfo;
  plan: PlanInfo;
  initialReceipt: ReceiptSummary | null;
  initialRefunded: boolean;
  environment: "production" | "sandbox";
  returnUrl: string;
  feedEnabled: boolean;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [receipt, setReceipt] = useState<ReceiptSummary | null>(initialReceipt);
  const [refund, setRefund] = useState<RefundSummary | null>(null);
  const [refunded, setRefunded] = useState(initialRefunded);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [modal, setModal] = useState<"none" | "pay" | "decline" | "3ds">(
    "none",
  );

  const log = useCallback((kind: string, detail: string) => {
    setEntries((prev) => [...prev, logEntry(kind, detail)]);
  }, []);

  const handleVerified = useCallback(
    (r: ReceiptSummary) => {
      setReceipt(r);
      setRefund(null);
      setRefunded(Boolean(r.substatus?.includes("refund")));
      setRefundError(null);
    },
    [],
  );

  const doRefund = useCallback(async () => {
    setRefundBusy(true);
    setRefundError(null);
    log("payments.refund", `${receipt?.id ?? ""} requested`);
    try {
      const res = await fetch("/api/refund", { method: "POST" });
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && data && typeof data === "object" && "refund" in data) {
        const r = (data as { refund: RefundSummary }).refund;
        setRefund(r);
        setRefunded(true);
        log(
          "payments.refund",
          `${r.id} -> ${r.substatus ?? r.status}, $${r.refundedAmount} returned`,
        );
      } else {
        const code =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "network";
        if (code === "already_refunded") setRefunded(true);
        setRefundError(REFUND_ERROR_COPY[code] ?? REFUND_ERROR_COPY.network);
        log("payments.refund", `rejected: ${code}`);
      }
    } catch {
      setRefundError(REFUND_ERROR_COPY.network);
    } finally {
      setRefundBusy(false);
    }
  }, [log, receipt?.id]);

  const declineCard = TEST_CARDS[1].number;
  const threeDsCard = TEST_CARDS[2].number;

  return (
    <div className="flex flex-col gap-4">
      <div data-annotation-id="environment" className="rounded-xl">
        <EnvBadge info={env} />
      </div>

      <Panel step={2} id="product" title="The product under test">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Text size="3" weight="bold">
              {plan.title}
            </Text>
            <Badge color="orange" variant="soft" size="1">
              {plan.priceLabel}
            </Badge>
            <Badge color="gray" variant="soft" size="1">
              {plan.planType}
            </Badge>
          </div>
          <dl className="flex flex-col gap-1">
            {[
              ["plan", plan.id],
              ["product", plan.productId],
              ["purchase_url", plan.purchaseUrl],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2">
                <dt className="w-24 shrink-0 text-[11px] uppercase tracking-wide text-[#9A9993]">
                  {label}
                </dt>
                <dd className="min-w-0">
                  <Code size="1" variant="ghost" className="break-all">
                    {value}
                  </Code>
                </dd>
              </div>
            ))}
          </dl>
          <Text size="1" color="gray">
            Fetched live from Whop just now. One script, npm run setup,
            created this product for the demo.
          </Text>
        </div>
      </Panel>

      <Panel step={3} id="pay" title="Pay with a test card">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            This is a real checkout, just with fake money. Pay with the
            success card and your receipt appears below.
          </Text>
          <Button type="button" size="3" onClick={() => setModal("pay")}>
            Buy {plan.title} · {plan.priceLabel}
          </Button>

          {receipt && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Text size="2" weight="bold">
                  Receipt
                </Text>
                <Badge
                  color={refunded ? "amber" : "green"}
                  variant="soft"
                  size="1"
                >
                  {refunded ? "refunded" : `${receipt.status}/${receipt.substatus ?? ""}`}
                </Badge>
              </div>
              <Code size="1" variant="ghost" className="break-all">
                {receipt.id}
              </Code>
              <Text size="1" color="gray">
                ${receipt.total} {receipt.currency.toUpperCase()}
                {receipt.cardLast4
                  ? ` · ${receipt.cardBrand ?? "card"} ending ${receipt.cardLast4}`
                  : ""}
                {receipt.paidAt
                  ? ` · paid ${new Date(receipt.paidAt).toLocaleTimeString()}`
                  : ""}
              </Text>
              <Text size="1" color="gray">
                We remember this receipt so step 5 can refund it.
              </Text>
            </div>
          )}
        </div>
      </Panel>

      <Panel step={4} id="break" title="Break it on purpose">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            Failures deserve practice too. One card always gets declined, the
            other asks for a bank security check before it goes through.
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="2"
              variant="soft"
              color="red"
              onClick={() => setModal("decline")}
            >
              Try the decline card
            </Button>
            <Button
              type="button"
              size="2"
              variant="soft"
              color="amber"
              onClick={() => setModal("3ds")}
            >
              Try the 3D Secure card
            </Button>
          </div>
          <Text size="1" color="gray">
            The fourth card, 4000 0000 0000 0341, is sneakier. It saves fine,
            but every charge on it fails, which is how you practice a saved
            card going bad.
          </Text>
        </div>
      </Panel>

      <Panel step={5} id="refund" title="Refund it">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            One click gives the money back. It takes a few seconds, because
            refunds are processed in the background.
          </Text>
          <Button
            type="button"
            size="2"
            disabled={!receipt || refunded || refundBusy}
            onClick={() => void doRefund()}
          >
            {refundBusy
              ? "Refunding..."
              : receipt
                ? `Refund ${receipt.id.slice(0, 12)}...`
                : "Refund (pay in step 3 first)"}
          </Button>

          {refundError && (
            <div className="rounded-lg border border-[#E5484D]/30 bg-[#E5484D]/5 px-4 py-3">
              <Text size="2" color="red" as="p">
                {refundError}
              </Text>
            </div>
          )}

          {refund && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Text size="2" weight="bold">
                  Refund result
                </Text>
                <Badge color="amber" variant="soft" size="1">
                  {refund.status}/{refund.substatus ?? "processing"}
                </Badge>
              </div>
              <Text size="1" color="gray">
                ${refund.refundedAmount} returned
                {refund.refundedAt
                  ? ` at ${new Date(refund.refundedAt).toLocaleTimeString()}`
                  : " (still settling)"}
              </Text>
              {refund.membershipStatus && (
                <Text size="1" color="gray">
                  The membership is still &quot;{refund.membershipStatus}
                  &quot;. A refund gives the money back but does not take the
                  buyer&apos;s access away.
                </Text>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel step={6} id="webhooks" title="Watch the webhooks">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            Whop reports every payment and refund here the moment it happens.
            The feed is live and shared by all visitors, so your payment from
            step 3 should be near the top.
          </Text>
          <WebhookFeed enabled={feedEnabled} />
          <Text size="1" color="gray">
            Every charge and refund from this page also shows up on the
            sandbox dashboard.
          </Text>
        </div>
      </Panel>

      <ActivityLog entries={entries} />

      <CheckoutModal
        open={modal !== "none"}
        onClose={() => setModal("none")}
        onVerified={handleVerified}
        onEvent={log}
        planId={plan.id}
        title={plan.title}
        priceLabel={plan.priceLabel}
        environment={environment}
        returnUrl={returnUrl}
        aboveEmbed={
          modal === "decline" ? (
            <div className="flex flex-col gap-2">
              <Text size="1" color="gray">
                Pay with the decline card and watch it get rejected. Close
                the checkout when you&apos;re done.
              </Text>
              <CardStrip highlight={declineCard} />
            </div>
          ) : modal === "3ds" ? (
            <div className="flex flex-col gap-2">
              <Text size="1" color="gray">
                Pay with the 3D Secure card. A bank security check appears
                inside the checkout, approve it and the payment goes through.
              </Text>
              <CardStrip highlight={threeDsCard} />
            </div>
          ) : (
            <CardStrip highlight={TEST_CARDS[0].number} />
          )
        }
      />
    </div>
  );
}
