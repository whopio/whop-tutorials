"use client";

import { Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import type { PreflightResult } from "@/lib/formation/preflight";
import type { UncheckedFinding } from "@/lib/formation/unchecked";

export function ResultPanel({
  result,
  unchecked,
  transportError,
}: {
  result: PreflightResult | null;
  unchecked: UncheckedFinding[];
  transportError: string | null;
}) {
  return (
    <Panel
      annotationId="result"
      step={5}
      title="What came back"
      blurb="Whop answers with one sentence at a time, so a broken application takes as many round trips as it has mistakes."
    >
      <div className="flex flex-col gap-3">
        {transportError && (
          <Verdict tone="bad" heading="The request never reached Whop">
            {transportError}
          </Verdict>
        )}

        {!result && !transportError && (
          <div className="rounded-lg border border-dashed border-[#E5E4E0] bg-[#FAFAF9] p-4">
            <Text size="2" color="gray" as="p">
              Nothing sent yet. The panel above holds the exact request.
            </Text>
          </div>
        )}

        {result?.outcome === "rejected" && (
          <Verdict tone="bad" heading={`Refused, HTTP ${result.error.status}`}>
            {result.error.message}
          </Verdict>
        )}

        {result?.outcome === "accepted" && (
          <Verdict tone="good" heading="Accepted">
            Whop validated every field and got as far as creating the checkout your user
            would pay. That is where the sandbox stops, so nothing was filed and nothing
            was charged.
          </Verdict>
        )}

        {result?.outcome === "checkout" && (
          <Verdict tone="good" heading="Checkout created">
            {`$${(result.checkout.total / 100).toFixed(2)} due at ${result.checkout.checkout_url}`}
          </Verdict>
        )}

        {result && (
          <details className="rounded-lg border border-[#E5E4E0] bg-white">
            <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-[#6B6A66]">
              The raw response
            </summary>
            <pre className="max-h-[200px] overflow-auto border-t border-[#E5E4E0] p-3 font-mono text-[11px] leading-[1.55] text-[#151515]">
              {JSON.stringify(
                result.outcome === "rejected"
                  ? { error: result.error }
                  : result.outcome === "checkout"
                    ? result.checkout
                    : {
                        error: {
                          type: "bad_request",
                          message: "Incorporation seller company is not configured",
                        },
                      },
                null,
                2,
              )}
            </pre>
          </details>
        )}

        {unchecked.length > 0 && (
          <div className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] p-3">
            <Text size="2" weight="bold" as="div">
              {`${unchecked.length} thing${unchecked.length === 1 ? "" : "s"} Whop did not check`}
            </Text>
            <Text size="1" color="gray" as="p" className="mt-1">
              None of these stopped the application. A state clerk stops them instead,
              weeks later, after your user has already paid $500.
            </Text>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {unchecked.map((finding, index) => (
                <li
                  key={index}
                  className="rounded-md border border-[#E5E4E0] bg-white px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Text size="1" weight="medium" as="span">
                      {finding.field}
                    </Text>
                    <span className="font-mono text-[11px] text-[#D93900]">
                      {finding.value}
                    </span>
                  </div>
                  <Text size="1" color="gray" as="div" className="mt-0.5">
                    {finding.detail}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

function Verdict({
  tone,
  heading,
  children,
}: {
  tone: "good" | "bad";
  heading: string;
  children: React.ReactNode;
}) {
  const good = tone === "good";
  return (
    <div
      className={[
        "rounded-lg border p-3",
        good ? "border-[#1A7F55]/30 bg-[#F1FAF5]" : "border-[#D93900]/30 bg-[#FFF6F3]",
      ].join(" ")}
    >
      <Text
        size="2"
        weight="bold"
        as="div"
        className={good ? "text-[#1A7F55]" : "text-[#D93900]"}
      >
        {heading}
      </Text>
      <Text size="2" as="p" className="mt-1">
        {children}
      </Text>
    </div>
  );
}
