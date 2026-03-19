import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan } from "@/lib/membership";
import { ChatArea } from "./_components/chat-area";

export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const user = await requireAuth({ redirect: false });
  const { bot: botParam } = await searchParams;

  const userPlan = user ? await getUserPlan(user.id) : null;

  const bots = await prisma.bot.findMany({
    where: user
      ? {
          OR: [
            { type: "MODEL" },
            { type: "SYSTEM" },
            { type: "USER", createdById: user.id },
          ],
        }
      : { type: { in: ["SYSTEM", "MODEL"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      createdById: true,
      planId: true,
      model: true,
      plan: { select: { price: true, name: true, checkoutUrl: true } },
    },
  });

  return (
    <ChatArea
      bots={bots}
      initialConversationId={null}
      initialMessages={[]}
      initialBotId={botParam || null}
      conversationBotId={null}
      userPlan={userPlan}
      userId={user?.id ?? null}
      allowCustomBots={!!userPlan?.allowCustomBots}
    />
  );
}
