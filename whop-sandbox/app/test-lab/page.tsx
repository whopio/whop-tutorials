import { SandboxCheckout } from "@/components/SandboxCheckout";
import { WHOP_IDS } from "@/constants/whop-ids";
import { getEnv } from "@/lib/env";

export default function TestLabPage() {
  const env = getEnv();
  return (
    <main>
      <h1>Sandbox test lab</h1>
      <SandboxCheckout
        planId={WHOP_IDS.planId}
        environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
        returnUrl={`${env.APP_URL}/test-lab`}
      />
    </main>
  );
}
