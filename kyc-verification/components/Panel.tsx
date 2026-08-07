import type { ReactNode } from "react";
import { Text } from "@whop/react/components";

// Every step of the walkthrough sits in one of these. The annotation id is what
// the step rail looks for when it outlines the current step.
export function Panel({
  annotationId,
  step,
  title,
  blurb,
  children,
  aside,
}: {
  annotationId: string;
  step: number;
  title: string;
  blurb: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      data-annotation-id={annotationId}
      className="rounded-xl border border-[#E5E4E0] bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F1F0] text-[11px] font-semibold text-[#6B6A66]">
            {step}
          </span>
          <div className="min-w-0">
            <Text size="3" weight="bold" as="div">
              {title}
            </Text>
            <Text size="2" color="gray" as="p" className="mt-1">
              {blurb}
            </Text>
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F1F0] px-2 py-1">
      <span className="text-[10px] uppercase tracking-wide text-[#9A9993]">{label}</span>
      <span className="font-mono text-[11px] text-[#151515]">{value}</span>
    </span>
  );
}
