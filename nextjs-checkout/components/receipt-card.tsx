interface ReceiptCardProps {
  plan: string;
  amount: number;
  type: "subscription" | "lifetime" | "unknown";
  date: Date;
  receiptId: string;
}

const TYPE_LABEL: Record<ReceiptCardProps["type"], string> = {
  subscription: "Subscription",
  lifetime: "One-time payment",
  unknown: "Payment",
};

export function ReceiptCard({
  plan,
  amount,
  type,
  date,
  receiptId,
}: ReceiptCardProps) {
  return (
    <section
      aria-labelledby="receipt-heading"
      className="bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-[var(--shadow-card)] p-6"
    >
      <h2
        id="receipt-heading"
        className="font-sans text-base font-semibold mb-5"
      >
        Receipt
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
            Plan
          </dt>
          <dd className="font-medium">{plan}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
            Amount
          </dt>
          <dd className="font-medium tabular">${amount.toFixed(2)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
            Type
          </dt>
          <dd className="font-medium">{TYPE_LABEL[type]}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
            Date
          </dt>
          <dd className="font-medium tabular">
            {date.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
            Receipt ID
          </dt>
          <dd className="font-mono text-xs truncate" title={receiptId}>
            {receiptId}
          </dd>
        </div>
      </dl>
    </section>
  );
}
