import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/session";
import { getSubscribedChannels } from "@/lib/library";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const subscriptions = user ? await getSubscribedChannels(user.id) : [];
  return (
    <AppShell user={user} subscriptions={subscriptions}>
      {children}
    </AppShell>
  );
}
