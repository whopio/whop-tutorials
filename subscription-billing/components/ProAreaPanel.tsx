import { Badge, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";

// Stand-in for whatever the subscription pays for. The point is the gate, not the content.
const PRO_ITEMS = [
  { title: "Weekly deep-dive", body: "This week: pricing pages that convert, with teardown notes." },
  { title: "Template library", body: "Forty ready-made templates, updated every month." },
  { title: "Members chat", body: "Ask questions and get answers from the team within a day." },
];

export function ProAreaPanel({
  unlocked,
  reason,
}: {
  unlocked: boolean;
  reason: string;
}) {
  return (
    <Panel
      step={3}
      id="access"
      title="The Pro area"
      meta={<Badge color={unlocked ? "green" : "gray"}>{unlocked ? "Unlocked" : "Locked"}</Badge>}
      footnote={
        <>
          Access comes from the membership&apos;s <Code size="1">status</Code>, read from Whop on every
          visit. Ended means locked, and a paused subscription locks when its paid month runs out.
        </>
      }
    >
      <div className="relative">
        <div className={["flex flex-col gap-2", unlocked ? "" : "pointer-events-none select-none blur-[3px]"].join(" ")} aria-hidden={!unlocked}>
          {PRO_ITEMS.map((item) => (
            <div key={item.title} className="rounded-lg border border-[#EFEEEA] bg-[#FBFAF8] px-3 py-2">
              <Text size="2" weight="bold" as="p">
                {item.title}
              </Text>
              <Text size="1" color="gray" as="p">
                {item.body}
              </Text>
            </div>
          ))}
        </div>
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-[#E5E4E0] bg-white px-3 py-2 text-center shadow-sm">
              <Text size="2" weight="bold" as="p">
                Locked
              </Text>
              <Text size="1" color="gray" as="p">
                {reason}
              </Text>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
