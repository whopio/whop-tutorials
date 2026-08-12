import { Badge, Code, Text } from "@whop/react/components";

export interface EnvInfo {
  sandbox: boolean;
  apiHost: string;
  dashboardHost: string;
  companyId: string;
  maskedKey: string;
}

// Step 1: the environment this page is actually wired to. Server-rendered
// from the same env the SDK client uses, so it can't drift from reality.
export function EnvBadge({ info }: { info: EnvInfo }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E5E4E0] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <Text size="2" weight="bold">
          Environment
        </Text>
        <Badge color={info.sandbox ? "orange" : "red"} variant="solid" size="1">
          {info.sandbox ? "sandbox" : "production"}
        </Badge>
      </div>

      <dl className="flex flex-col gap-1.5">
        {[
          ["API", info.apiHost],
          ["Dashboard + checkout", info.dashboardHost],
          ["Company", info.companyId],
          ["API key", info.maskedKey],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-[11px] uppercase tracking-wide text-[#9A9993]">
              {label}
            </dt>
            <dd className="min-w-0">
              <Code size="1" variant="ghost" className="break-all">
                {value}
              </Code>
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-lg bg-[#151515] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#F1F1F1]">
        <span className="text-[#9A9993]">{"// every SDK call on this page"}</span>
        <br />
        {"new Whop({ apiKey, baseURL:"}
        <br />
        {'  "https://sandbox-api.whop.com/api/v1" })'}
      </div>

      <Text size="1" color="gray">
        No real money moves here. The sandbox is its own separate account at
        sandbox.whop.com, nothing crosses over from the real Whop.
      </Text>
    </div>
  );
}
