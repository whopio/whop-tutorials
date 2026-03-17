import { convertToModelMessages, streamText } from "ai";
import { getModel } from "@/lib/ai";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserPlan,
  canAccessBot,
  getMessageCountToday,
  isOverMessageLimit,
} from "@/lib/membership";

export async function POST(req: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { messages, botId, conversationId } = body;

  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { plan: { select: { price: true } } },
  });
  if (!bot) return new Response("Bot not found", { status: 404 });

  const userPlan = await getUserPlan(user.id);

  if (!canAccessBot(bot, userPlan, user.id)) {
    return new Response("Upgrade required to access this bot", { status: 403 });
  }

  const count = await getMessageCountToday(user.id);
  if (isOverMessageLimit(count, userPlan)) {
    return new Response("Daily message limit reached", { status: 429 });
  }

  // Extract the last user message text
  const lastMessage = messages[messages.length - 1];
  const lastUserText =
    lastMessage?.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join("") ||
    lastMessage?.content ||
    "New chat";

  let activeConversationId = conversationId as string | undefined;
  if (!activeConversationId) {
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        botId: bot.id,
        title: lastUserText.slice(0, 50),
      },
    });
    activeConversationId = conversation.id;
  }

  let systemPrompt = bot.systemPrompt;
  if (bot.knowledge) {
    systemPrompt += `\n\nReference knowledge:\n${bot.knowledge}`;
  }

  // Only send the last 20 messages to keep token usage low
  const recentMessages = messages.slice(-20);
  const modelMessages = await convertToModelMessages(recentMessages);

  const result = streamText({
    model: getModel(bot.model),
    maxRetries: 1,
    maxOutputTokens: 1024,
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ text, usage }) => {
      await prisma.message.createMany({
        data: [
          {
            conversationId: activeConversationId!,
            role: "USER",
            content: lastUserText,
            tokenCount: usage?.inputTokens || 0,
          },
          {
            conversationId: activeConversationId!,
            role: "ASSISTANT",
            content: text,
            tokenCount: usage?.outputTokens || 0,
          },
        ],
      });

      await prisma.conversation.update({
        where: { id: activeConversationId },
        data: { updatedAt: new Date() },
      });
    },
  });

  const limit = userPlan ? 50 : 20;
  const remaining = Math.max(0, limit - count - 1);

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Conversation-Id": activeConversationId!,
      "X-Messages-Remaining": String(remaining),
    },
  });
}
