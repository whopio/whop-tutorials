import type { ReactNode } from "react";

// A plain anchor for the walkthrough ring: StepRail sets
// [data-step-current] on the matching [data-annotation-id] element and
// the ring renders via globals.css. No popover, no client JS.
export function StepAnchor({
  id,
  block = false,
  children,
}: {
  id: string;
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      data-annotation-id={id}
      // inline-flex shrink-wraps exactly (no baseline descender gap), so
      // the walkthrough ring stays centered on small targets like pills.
      className={block ? "relative block w-full" : "relative inline-flex"}
    >
      {children}
    </span>
  );
}
