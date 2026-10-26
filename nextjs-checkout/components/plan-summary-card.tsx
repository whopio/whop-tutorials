import Link from "next/link";
import { Check } from "lucide-react";

interface PlanSummaryCardProps {
  name: string;
  price: number;
  priceSuffix: string;
  features: string[];
}

export function PlanSummaryCard({
  name,
  price,
  priceSuffix,
  features,
}: PlanSummaryCardProps) {
  return (
    <aside className="bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-[var(--shadow-card)] p-6 flex flex-col gap-5">
      <header>
        <h2 className="font-sans text-xl font-semibold tracking-tight">{name}</h2>
      </header>
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-4xl tabular">${price}</span>
        <span className="text-sm text-[color:var(--color-fg-muted)]">
          {priceSuffix}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)] font-medium">
          What you get
        </span>
        <ul className="flex flex-col gap-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <Check
                size={16}
                strokeWidth={1.75}
                className="mt-[3px] shrink-0 text-[color:var(--color-accent-success)]"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="/"
        className="text-sm text-[color:var(--color-fg-muted)] underline hover:text-[color:var(--color-fg-primary)] transition-colors"
      >
        Change plan
      </Link>
    </aside>
  );
}
