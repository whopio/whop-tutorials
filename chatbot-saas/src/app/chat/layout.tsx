import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getUserPlan, getConversationLimit } from "@/lib/membership";
import { Sidebar } from "./_components/sidebar";
import { ChatShell } from "./_components/chat-shell";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth({ redirect: false });

  let userPlan: Awaited<ReturnType<typeof getUserPlan>> = null;
  let admin = false;
  let conversations: {
    id: string;
    title: string | null;
    updatedAt: string;
    bot: { name: string };
  }[] = [];
  let plans: {
    name: string;
    price: number;
    checkoutUrl: string;
    allowCustomBots: boolean;
    whopPlanId: string;
  }[] = [];

  if (user) {
    [userPlan, admin] = await Promise.all([
      getUserPlan(user.id),
      isAdmin(),
    ]);

    const limit = getConversationLimit(userPlan);

    const [rawConversations, rawPlans] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          bot: { select: { name: true } },
        },
      }),
      !userPlan
        ? prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: "asc" },
            select: { name: true, price: true, checkoutUrl: true, allowCustomBots: true, whopPlanId: true },
          })
        : [],
    ]);

    conversations = rawConversations.map((c) => ({
      ...c,
      updatedAt: c.updatedAt.toISOString(),
    }));
    plans = rawPlans;
  } else {
    plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      select: { name: true, price: true, checkoutUrl: true, allowCustomBots: true, whopPlanId: true },
    });
  }

  return (
    <ChatShell
      sidebar={
        <Sidebar
          conversations={conversations}
          user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}
          userPlan={userPlan ? { name: userPlan.name, price: userPlan.price, allowCustomBots: userPlan.allowCustomBots } : null}
          isAdmin={admin}
          plans={plans}
          isAuthenticated={!!user}
        />
      }
    >
      {children}
    </ChatShell>
  );
}
