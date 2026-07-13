import { getEnv } from "@/lib/env";
import { getProdEnv } from "@/lib/prod-env";
import { ChatDemo } from "@/components/ChatDemo";
import { channels, demoUsers, dms, supportByUser } from "@/constants/whop-ids";
import { provisioned as prodProvisioned } from "@/constants/whop-ids.prod";

export default function Home() {
  const sandbox = getEnv().WHOP_SANDBOX;
  // The "Prebuilt embed" tab renders live only when the production company is
  // both configured (env) and provisioned (constants). Otherwise the toggle
  // falls back to the Chat API tab and the embed shows a placeholder.
  const prodReady = getProdEnv().configured && prodProvisioned;
  return (
    <ChatDemo
      sandbox={sandbox}
      prodReady={prodReady}
      demoUsers={demoUsers}
      channels={{ general: channels.general, announcements: channels.announcements }}
      dms={dms}
      supportByUser={supportByUser}
    />
  );
}
