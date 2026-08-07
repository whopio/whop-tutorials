import { getEnv } from "@/lib/env";
import { KycLab } from "@/components/KycLab";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = getEnv();

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <KycLab sandbox={env.WHOP_SANDBOX} redirectUrl={`${env.APP_URL}/`} />
    </main>
  );
}
