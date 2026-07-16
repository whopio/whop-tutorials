import { Text } from "@whop/react/components";

const STEPS = [
  { n: 1, title: "Select a product" },
  { n: 2, title: "Start the free trial" },
  { n: 3, title: "Trial running" },
] as const;

// The 1-2-3 progress rail for the interactive walkthrough. Reuses the
// numbered-pill styling from the paywall demo's StepRail.
export function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-col gap-0.5">
      {STEPS.map((s) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <div
            key={s.n}
            className={[
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition",
              active
                ? "border-[#FA4616]/40 bg-white shadow-sm"
                : "border-transparent",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                active
                  ? "bg-[#FA4616] text-white"
                  : done
                    ? "bg-[#FA4616]/15 text-[#D13415]"
                    : "bg-[#E5E4E0] text-[#151515]/70",
              ].join(" ")}
            >
              {done ? "✓" : s.n}
            </span>
            <Text
              size="2"
              weight={active ? "bold" : "regular"}
              color={active ? undefined : "gray"}
            >
              {s.title}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
