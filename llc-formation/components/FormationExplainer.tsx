import { Text } from "@whop/react/components";

export function FormationExplainer() {
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white p-5 shadow-sm">
      <Text size="5" weight="bold" as="div" className="tracking-tight">
        Offer company formation on your platform
      </Text>

      <div className="mt-2.5 flex flex-col gap-2.5">
        <Text size="2" color="gray" as="p">
          Plenty of platforms have users who need to be a real company before they can get
          paid properly, invoice a business client, or open a bank account. Whop lets you
          register one for them with a single POST, and run it as a program rather than a
          one-off.
        </Text>

        <Text size="2" color="gray" as="p">
          Below is that program mid-flight: five users, four already registered or filing,
          one still waiting. Form a company for the one who is waiting and watch what Whop
          says back.
        </Text>

        <Text size="2" color="gray" as="p">
          Every request on this page is real and goes to Whop&apos;s sandbox, which validates
          the whole thing and then refuses to create the checkout. No company can be formed
          from here, and nothing is charged.
        </Text>
      </div>

      <div className="mt-3.5 flex flex-col gap-1.5 border-t border-[#E5E4E0] pt-3.5">
        <Row k="Endpoint" v="POST /accounts/{id}/form_company" />
        <Row k="Entity types" v="LLC or C-Corp" />
        <Row k="States" v="50 plus DC" />
        <Row k="Your user pays" v="$500, or $750 expedited" />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Text size="1" color="gray" as="span">
        {k}
      </Text>
      <span className="text-right font-mono text-[11px] text-[#151515]">{v}</span>
    </div>
  );
}
