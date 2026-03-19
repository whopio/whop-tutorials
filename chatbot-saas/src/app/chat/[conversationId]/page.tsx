import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan } from "@/lib/membership";
import { ChatArea } from "../_components/chat-area";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const user = await requireAuth();
  if (!user) return null;

  const { conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true },
      },
      bot: { select: { id: true } },
    },
  });

  if (!conversation || conversation.userId !== user.id) {
    redirect("/chat");
  }

  const userPlan = await getUserPlan(user.id);

  const bots = await prisma.bot.findMany({
    where: {
      OR: [
        { type: "MODEL" },
        { type: "SYSTEM" },
        { type: "USER", createdById: user.id },
      ],
    },
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
      initialConversationId={conversationId}
      initialMessages={conversation.messages}
      initialBotId={conversation.bot.id}
      conversationBotId={conversation.bot.id}
      userPlan={userPlan}
      userId={user.id}
      allowCustomBots={!!userPlan?.allowCustomBots}
    />
  );
}
