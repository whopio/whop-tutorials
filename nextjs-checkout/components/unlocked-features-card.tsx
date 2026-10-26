import { Check, Lock } from "lucide-react";

interface UnlockedFeaturesCardProps {
  features: string[];
  active: boolean;
  title?: string;
}

export function UnlockedFeaturesCard({
  features,
  active,
  title,
}: UnlockedFeaturesCardProps) {
  return (
    <section
      aria-labelledby="features-heading"
      className="bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-[var(--shadow-card)] p-6"
    >
      <h2
        id="features-heading"
        className="font-sans text-base font-semibold mb-5"
      >
        {title ?? (active ? "What you unlocked" : "What Pro includes")}
      </h2>
      <ul className="flex flex-col gap-3">
        {features.map((feature) => (
          <li
            key={feature}
            className={[
              "flex items-start gap-3 text-sm",
              active ? "" : "text-[color:var(--color-fg-muted)]",
            ].join(" ")}
          >
            {active ? (
              <Check
                size={18}
                strokeWidth={1.75}
                className="mt-[2px] shrink-0 text-[color:var(--color-accent-success)]"
                aria-hidden="true"
              />
            ) : (
              <Lock
                size={16}
                strokeWidth={1.75}
                className="mt-[3px] shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{feature}</span>
            <span
              className={[
                "ml-auto text-[11px] uppercase tracking-wider font-semibold",
                active
                  ? "text-[color:var(--color-fg-primary)]"
                  : "text-[color:var(--color-fg-muted)]",
              ].join(" ")}
            >
              {active ? "active" : "locked"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
