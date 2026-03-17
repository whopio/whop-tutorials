"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, USER_BOT_LIMIT, MAX_KNOWLEDGE_LENGTH } from "@/lib/membership";
import { SUPPORTED_MODELS } from "@/lib/ai";

const modelIds = SUPPORTED_MODELS.map((m) => m.id) as [string, ...string[]];

const botSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  systemPrompt: z.string().min(1).max(5000),
  knowledge: z.string().max(MAX_KNOWLEDGE_LENGTH).optional(),
  model: z.enum(modelIds),
});

export async function createUserBot(formData: FormData) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const userPlan = await getUserPlan(user.id);
  if (!userPlan?.allowCustomBots) throw new Error("Custom bots not available on your plan");

  const count = await prisma.bot.count({
    where: { type: "USER", createdById: user.id },
  });
  if (count >= USER_BOT_LIMIT) throw new Error("Bot limit reached");

  const parsed = botSchema.parse({
    name: (formData.get("name") as string)?.trim(),
    description: (formData.get("description") as string)?.trim(),
    systemPrompt: (formData.get("systemPrompt") as string)?.trim(),
    knowledge: (formData.get("knowledge") as string)?.trim() || undefined,
    model: (formData.get("model") as string)?.trim(),
  });

  await prisma.bot.create({
    data: {
      ...parsed,
      knowledge: parsed.knowledge || null,
      type: "USER",
      createdById: user.id,
    },
  });

  redirect("/bots");
}

export async function updateUserBot(formData: FormData) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  if (!botId) throw new Error("Bot ID is required");

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot || bot.type !== "USER" || bot.createdById !== user.id) {
    throw new Error("Bot not found");
  }

  const parsed = botSchema.parse({
    name: (formData.get("name") as string)?.trim(),
    description: (formData.get("description") as string)?.trim(),
    systemPrompt: (formData.get("systemPrompt") as string)?.trim(),
    knowledge: (formData.get("knowledge") as string)?.trim() || undefined,
    model: (formData.get("model") as string)?.trim(),
  });

  await prisma.bot.update({
    where: { id: botId },
    data: { ...parsed, knowledge: parsed.knowledge || null },
  });

  redirect("/bots");
}

export async function deleteUserBot(formData: FormData) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  if (!botId) throw new Error("Bot ID is required");

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot || bot.type !== "USER" || bot.createdById !== user.id) {
    throw new Error("Bot not found");
  }

  await prisma.bot.delete({ where: { id: botId } });
  redirect("/bots");
}
