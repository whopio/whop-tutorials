import { Check } from "lucide-react";

export interface PricingCardProps {
  planKey: "subscription" | "lifetime";
  name: string;
  price: number;
  priceSuffix: string;
  description: string;
  features: readonly string[];
  ctaLabel?: string;
}

export function PricingCard({
  planKey,
  name,
  price,
  priceSuffix,
  description,
  features,
  ctaLabel = "Get started",
}: PricingCardProps) {
  return (
    <article className="bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-[var(--shadow-card)] p-8 flex flex-col gap-6 transition-all duration-200 ease-out hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5">
      <header className="flex flex-col gap-2">
        <h3 className="font-sans text-xl font-semibold tracking-tight">{name}</h3>
        <p className="text-sm text-[color:var(--color-fg-muted)]">{description}</p>
      </header>
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-[64px] leading-none tabular border-b-2 border-[color:var(--color-accent-primary)] pb-1">
          ${price}
        </span>
        <span className="text-sm text-[color:var(--color-fg-muted)]">
          {priceSuffix}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-base">
            <Check
              size={18}
              strokeWidth={1.75}
              className="mt-[3px] shrink-0 text-[color:var(--color-accent-success)]"
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <form action="/api/checkout" method="POST" className="mt-auto">
        <input type="hidden" name="plan" value={planKey} />
        <button
          type="submit"
          className="w-full h-12 rounded-[var(--radius-sm)] bg-[color:var(--color-accent-primary)] hover:bg-[color:var(--color-accent-primary-hover)] text-[color:var(--color-accent-primary-fg)] font-semibold text-base transition-all duration-150 active:scale-[0.98]"
        >
          {ctaLabel}
        </button>
      </form>
    </article>
  );
}
