import type { ReactNode } from "react";
import { Text } from "@whop/react/components";

// Every panel in the lab shares this frame: a numbered chip, a title, optional
// meta on the right, the body, and a footnote pinned to the bottom edge so
// two cards sitting side by side line their small print up with each other.
//
// The number is not decoration. The six panels are the six steps of the
// walkthrough, in order, and the rail highlights them by the same id.
export function Panel({
  step,
  id,
  title,
  meta,
  children,
  footnote,
  hero = false,
}: {
  step: number;
  id: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  footnote?: ReactNode;
  hero?: boolean;
}) {
  return (
    <section
      data-annotation-id={id}
      className={[
        "flex h-full flex-col gap-3 rounded-xl border p-4 shadow-sm transition-colors",
        hero
          ? "border-[#151515]/12 bg-[#FBFAF8]"
          : "border-[#E5E4E0] bg-white",
      ].join(" ")}
    >
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#151515] text-[11px] font-semibold text-white"
        >
          {step}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-[#151515]">
          {title}
        </h2>
        {meta && <div className="shrink-0">{meta}</div>}
      </header>

      <div className="flex flex-1 flex-col gap-3">{children}</div>

      {footnote && (
        <footer className="mt-auto border-t border-[#EFEEEA] pt-2.5">
          <Text size="1" color="gray" as="div">
            {footnote}
          </Text>
        </footer>
      )}
    </section>
  );
}
