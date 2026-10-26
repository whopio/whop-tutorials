import { Check } from "lucide-react";

export type Step = "plan" | "checkout" | "complete";

const steps: Array<{ key: Step; label: string }> = [
  { key: "plan", label: "Choose plan" },
  { key: "checkout", label: "Checkout" },
  { key: "complete", label: "Complete" },
];

export function ProgressionBar({ current }: { current: Step }) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol
      aria-label="Checkout progress"
      className="flex items-center gap-2 sm:gap-4 w-full max-w-2xl mx-auto"
    >
      {steps.map((step, index) => {
        const state =
          index < currentIndex
            ? "done"
            : index === currentIndex
              ? "current"
              : "upcoming";

        return (
          <li key={step.key} className="flex-1 flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span
                aria-hidden="true"
                className={[
                  "shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                  state === "done"
                    ? "bg-[color:var(--color-accent-success)] text-[color:var(--color-fg-primary)]"
                    : state === "current"
                      ? "bg-[color:var(--color-accent-primary)] text-[color:var(--color-fg-primary)]"
                      : "border border-[color:var(--color-border)] text-[color:var(--color-fg-muted)]",
                ].join(" ")}
              >
                {state === "done" ? <Check size={16} strokeWidth={2} /> : index + 1}
              </span>
              <span
                className={[
                  "text-sm font-medium truncate",
                  state === "upcoming"
                    ? "text-[color:var(--color-fg-muted)]"
                    : "text-[color:var(--color-fg-primary)]",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={[
                  "h-[2px] flex-1 rounded-full",
                  index < currentIndex
                    ? "bg-[color:var(--color-accent-success)]"
                    : "bg-[color:var(--color-border)]",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
