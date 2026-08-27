"use client";

import { Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { PRODUCTION_EXAMPLE } from "@/lib/formation/preflight";

const STAGES = [
  { status: "draft", detail: "Where the application sits until your user pays." },
  { status: "processing", detail: "Paid. Whop files with the state and applies for the EIN." },
  { status: "filed", detail: "The state has the paperwork. Documents start appearing." },
  { status: "completed", detail: "Registered, EIN issued, Articles of Organization downloadable." },
];

export function WallPanel({ reached }: { reached: boolean }) {
  return (
    <Panel
      annotationId="wall"
      step={6}
      title="Hand it to your user"
      blurb="You do not pay for the formation. You pass the checkout on, and the filing starts when they settle it."
    >
      <div className="flex flex-col gap-3">
        <div
          className={[
            "rounded-lg border-2 border-dashed p-4",
            reached ? "border-[#FA4616] bg-[#FFF8F5]" : "border-[#E5E4E0] bg-[#FAFAF9]",
          ].join(" ")}
        >
          <Text size="3" weight="bold" as="div">
            This is where checkout would open.
          </Text>
          <Text size="2" as="p" className="mt-1.5">
            In production the response carries a Whop checkout link for $500. You show it to
            your user, and once they pay it the filing is real: state registration, EIN,
            Articles of Organization, the lot.
          </Text>
          <Text size="2" as="p" className="mt-1.5">
            Nobody can pay here, because this demo runs on Whop&apos;s sandbox and the sandbox
            cannot form companies. Everything above this line was a real API call.
          </Text>
        </div>

        <div>
          <Text size="1" weight="medium" as="div" className="mb-1.5">
            What production answers with
          </Text>
          <pre className="overflow-auto rounded-lg border border-[#E5E4E0] bg-white p-3 font-mono text-[11px] leading-[1.55] text-[#151515]">
            {JSON.stringify(PRODUCTION_EXAMPLE, null, 2)}
          </pre>
          <Text size="1" color="gray" as="p" className="mt-1.5">
            <Code size="1" variant="soft">
              total
            </Code>{" "}
            is in cents, and it is a flat fee: $400 for the formation plus $100 for the first
            year of registered agent. Read it off the response rather than hardcoding it,
            because it has moved once already.
          </Text>
        </div>

        <div>
          <Text size="1" weight="medium" as="div" className="mb-1.5">
            Then you track it on their account
          </Text>
          <ol className="flex flex-col gap-1">
            {STAGES.map((stage, index) => (
              <li
                key={stage.status}
                className="flex items-start gap-2.5 rounded-md border border-[#E5E4E0] bg-white px-2.5 py-1.5"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F1F1F0] text-[10px] font-semibold text-[#6B6A66]">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <code className="font-mono text-[11px] text-[#151515]">{stage.status}</code>
                  <Text size="1" color="gray" as="div">
                    {stage.detail}
                  </Text>
                </span>
              </li>
            ))}
          </ol>
          <Text size="1" color="gray" as="p" className="mt-1.5">
            Read{" "}
            <Code size="1" variant="soft">
              company_formation
            </Code>{" "}
            when you retrieve their account, or listen for{" "}
            <Code size="1" variant="soft">
              account.updated
            </Code>{" "}
            rather than polling every user you have.
          </Text>
        </div>
      </div>
    </Panel>
  );
}
