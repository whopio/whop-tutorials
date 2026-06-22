"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, Code, Text } from "@whop/react/components";
import type { WalkthroughStep } from "@/components/steps";

function renderInlineCode(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <Code key={i} size="1" variant="soft">
          {part.slice(1, -1)}
        </Code>
      );
    }
    return part;
  });
}

// The auto-running walkthrough. The step list and the explanation panel
// have fixed geometry, so Back/Next never move under the cursor.
// Highlights the current step's element via [data-step-current].
export function StepRail({ steps }: { steps: WalkthroughStep[] }) {
  const [current, setCurrent] = useState(0);

  const go = useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(steps.length - 1, index)));
    },
    [steps.length],
  );

  useEffect(() => {
    document.querySelectorAll("[data-step-current]").forEach((el) => {
      el.removeAttribute("data-step-current");
    });
    const target = document.querySelector(
      `[data-annotation-id="${steps[current]?.id}"]`,
    );
    if (target) {
      target.setAttribute("data-step-current", "true");
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    return () => {
      document.querySelectorAll("[data-step-current]").forEach((el) => {
        el.removeAttribute("data-step-current");
      });
    };
  }, [current, steps]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrent((s) => Math.min(steps.length - 1, s + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrent((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [steps.length]);

  const step = steps[current];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        {steps.map((s, i) => {
          const active = i === current;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              className={[
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition",
                active
                  ? "border-[#FA4616]/40 bg-white shadow-sm"
                  : "border-transparent hover:bg-white/60",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  active
                    ? "bg-[#FA4616] text-white"
                    : "bg-[#E5E4E0] text-[#151515]/70",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <Text size="2" weight={active ? "bold" : "regular"}>
                {s.title}
              </Text>
            </button>
          );
        })}
      </div>

      <div className="min-h-[188px] rounded-xl border border-[#FA4616]/30 bg-white p-3.5 shadow-sm">
        {step && (
          <Text size="2" color="gray" as="div">
            {renderInlineCode(step.body)}
          </Text>
        )}
      </div>

      <div className="flex items-center justify-between pl-1">
        <Text size="1" color="gray">
          {current + 1} / {steps.length}
        </Text>
        <div className="flex gap-2">
          <Button
            type="button"
            size="1"
            variant="soft"
            color="gray"
            disabled={current === 0}
            onClick={() => go(current - 1)}
          >
            &larr; Back
          </Button>
          <Button
            type="button"
            size="1"
            disabled={current === steps.length - 1}
            onClick={() => go(current + 1)}
          >
            Next &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
