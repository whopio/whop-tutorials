"use client";

import { Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { STATUS_LABEL, type RosterUser } from "@/constants/roster";

const ORDER: RosterUser["status"][] = ["draft", "processing", "filed", "completed"];

// What you show a user who has already sent their application. Everything here
// comes off company_formation when you retrieve their account, so a platform
// renders this from stored state rather than by asking the user anything.
export function TrackingPanel({ user }: { user: RosterUser }) {
  const reached = ORDER.indexOf(user.status);

  return (
    <Panel
      annotationId="tracking"
      step={2}
      title={user.legalName ?? user.name}
      blurb={`${user.entity} in ${user.state}. This is the same account, read back after the application was sent.`}
      aside={
        <span className="shrink-0 rounded-md bg-[#F1F1F0] px-2 py-1 text-[11px] text-[#6B6A66]">
          Example state
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <ol className="flex flex-col gap-1">
          {ORDER.map((status, index) => {
            const done = index < reached;
            const here = index === reached;
            return (
              <li
                key={status}
                className={[
                  "flex items-center gap-2.5 rounded-md border px-2.5 py-2",
                  here ? "border-[#FA4616] bg-[#FFF8F5]" : "border-[#E5E4E0] bg-white",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    done || here ? "bg-[#FA4616] text-white" : "bg-[#F1F1F0] text-[#9A9993]",
                  ].join(" ")}
                >
                  {index + 1}
                </span>
                <code className="font-mono text-[11px] text-[#151515]">{status}</code>
                {here && (
                  <Text size="1" color="gray" as="span">
                    {STATUS_LABEL[user.status]}
                  </Text>
                )}
              </li>
            );
          })}
        </ol>

        <div className="grid gap-2 sm:grid-cols-2">
          <Flag label="state_registered" on={user.stateRegistered ?? false} />
          <Flag label="ein_registered" on={user.einRegistered ?? false} />
        </div>

        {user.awaitingSignature && (
          <div className="rounded-lg border border-[#D9A400]/40 bg-[#FFFBF0] p-2.5">
            <Text size="1" as="p">
              Waiting on a signature. Send this user the hosted link on{" "}
              <Code size="1" variant="soft">
                signatures.{user.awaitingSignature}
              </Code>
              , which expires and has to be refetched.
            </Text>
          </div>
        )}

        {user.documents && user.documents.length > 0 && (
          <div>
            <Text size="1" weight="medium" as="div" className="mb-1.5">
              Available on{" "}
              <Code size="1" variant="soft">
                documents
              </Code>
            </Text>
            <div className="flex flex-wrap gap-1.5">
              {user.documents.map((doc) => (
                <span
                  key={doc}
                  className="rounded-md border border-[#E5E4E0] bg-white px-2 py-1 text-[11px] text-[#151515]"
                >
                  {doc}
                </span>
              ))}
            </div>
          </div>
        )}

        <Text size="1" color="gray" as="p">
          None of this is polled. It arrives on the{" "}
          <Code size="1" variant="soft">
            account.updated
          </Code>{" "}
          webhook and you store it against your own user record.
        </Text>
      </div>
    </Panel>
  );
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[#E5E4E0] bg-white px-2.5 py-1.5">
      <code className="font-mono text-[11px] text-[#151515]">{label}</code>
      <span
        className={[
          "rounded px-1.5 py-0.5 text-[10px] font-semibold",
          on ? "bg-[#1A7F55]/10 text-[#1A7F55]" : "bg-[#F1F1F0] text-[#9A9993]",
        ].join(" ")}
      >
        {on ? "true" : "false"}
      </span>
    </div>
  );
}
