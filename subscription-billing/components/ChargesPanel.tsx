import { Badge, Code, Text } from "@whop/react/components";
import type { Charge } from "@/lib/payments";
import { Panel } from "@/components/Panel";
import { shortDate, usd } from "@/components/format";

const REASON_LABEL: Record<string, string> = {
  subscription_create: "First charge",
  subscription_cycle: "Renewal",
};

export function ChargesPanel({
  signedIn,
  charges,
  renewsAt,
}: {
  signedIn: boolean;
  charges: Charge[];
  renewsAt: string | null;
}) {
  return (
    <Panel
      step={6}
      id="renewals"
      title="Renewals"
      meta={signedIn && charges.length > 0 ? <Badge color="gray">{charges.length}</Badge> : null}
      footnote={
        <>
          Whop charges each renewal itself. <Code size="1">payments.list</Code> with the{" "}
          <Code size="1">membership_id</Code> shows every charge, and a webhook hears about them as
          they happen.
        </>
      }
    >
      {!signedIn && (
        <Text size="2" color="gray">
          Sign in first. Every charge on your subscription lands here, renewals included.
        </Text>
      )}
      {signedIn && charges.length === 0 && (
        <Text size="2" color="gray">
          No charges yet. The first one appears the moment you subscribe.
        </Text>
      )}
      {charges.length > 0 && (
        <div className="flex flex-col divide-y divide-[#EFEEEA] rounded-lg border border-[#EFEEEA]">
          {charges.map((charge) => (
            <div key={charge.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex flex-col">
                <Text size="2">{REASON_LABEL[charge.billingReason] ?? charge.billingReason}</Text>
                <Text size="1" color="gray">
                  {shortDate(charge.createdAt)}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <Text size="2" weight="medium">
                  {usd(charge.total)}
                </Text>
                <Badge color={charge.status === "paid" ? "green" : "orange"}>{charge.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      {signedIn && charges.length > 0 && renewsAt && (
        <Text size="1" color="gray">
          Next renewal on {shortDate(renewsAt)}. Subscribed with <Code size="1">4000 0000 0000 0341</Code>?
          That one fails, and Whop retries it.
        </Text>
      )}
    </Panel>
  );
}
