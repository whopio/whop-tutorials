import { Badge, Code, Text } from "@whop/react/components";
import type { Receipt } from "@/lib/payments";
import { Panel } from "@/components/Panel";
import { usd } from "@/components/format";

const REASON_LABEL: Record<string, string> = {
  subscription_create: "First charge",
  subscription_cycle: "Renewal",
};

export function ReceiptPanel({ signedIn, receipt }: { signedIn: boolean; receipt: Receipt | null }) {
  const feeTotal = receipt ? receipt.fees.reduce((sum, fee) => sum + fee.amount, 0) : 0;
  const keepShare = receipt && receipt.total > 0 ? (receipt.youKeep / receipt.total) * 100 : 0;

  return (
    <Panel
      step={5}
      id="receipt"
      title="What you keep"
      meta={receipt ? <Badge color="gray">{REASON_LABEL[receipt.billingReason] ?? receipt.billingReason}</Badge> : null}
      footnote={
        <>
          <Code size="1">payments.listFees</Code> lists every fee on a payment, and{" "}
          <Code size="1">amount_after_fees</Code> is what reaches your balance.
        </>
      }
    >
      {!receipt && (
        <Text size="2" color="gray">
          {signedIn
            ? "Subscribe and the newest charge is broken down here, from your side as the app's owner."
            : "Sign in first. Each charge is broken down here, fee by fee."}
        </Text>
      )}

      {receipt && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Text size="2" color="gray">
              Subscriber paid
            </Text>
            <Text size="5" weight="bold">
              {usd(receipt.total)}
            </Text>
          </div>

          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#EFEEEA]" aria-hidden>
            <div className="bg-[#151515]" style={{ width: `${keepShare}%` }} />
            <div className="bg-[#D6D4CE]" style={{ width: `${100 - keepShare}%` }} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#151515]" aria-hidden />
              <Text size="2" className="flex-1">
                You keep
              </Text>
              <Text size="2" weight="bold">
                {usd(receipt.youKeep)}
              </Text>
            </div>
            <details>
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#D6D4CE]" aria-hidden />
                  <Text size="2" color="gray" className="flex-1">
                    {`Whop's fees (${receipt.fees.length}) ▾`}
                  </Text>
                  <Text size="2">{usd(feeTotal)}</Text>
                </div>
              </summary>
              <div className="mt-1.5 flex flex-col gap-1 border-l border-[#EFEEEA] pl-3">
                {receipt.fees.map((fee) => (
                  <div key={fee.label} className="flex items-center justify-between gap-2">
                    <Text size="1" color="gray" className="min-w-0 truncate">
                      {fee.label}
                    </Text>
                    <Text size="1" color="gray">
                      {usd(fee.amount)}
                    </Text>
                  </div>
                ))}
              </div>
            </details>
          </div>

          <Text size="1" color="gray">
            <Code size="1" variant="ghost">
              {receipt.paymentId}
            </Code>
          </Text>
        </div>
      )}
    </Panel>
  );
}
