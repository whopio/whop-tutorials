"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createBot(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const systemPrompt = (formData.get("systemPrompt") as string)?.trim();
  const knowledge = (formData.get("knowledge") as string)?.trim() || null;
  const planId = (formData.get("planId") as string)?.trim() || null;
  const model = (formData.get("model") as string)?.trim() || null;

  if (!name || !description || !systemPrompt) {
    throw new Error("Name, description, and system prompt are required.");
  }

  await prisma.bot.create({
    data: { name, description, systemPrompt, knowledge, planId, model, type: "SYSTEM" },
  });

  redirect("/admin/bots");
}

export async function updateBotPrompt(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  const systemPrompt = (formData.get("systemPrompt") as string)?.trim();
  const model = (formData.get("model") as string)?.trim() || null;

  if (!botId || !systemPrompt) {
    throw new Error("Bot ID and system prompt are required.");
  }

  await prisma.bot.update({
    where: { id: botId },
    data: { systemPrompt, model },
  });

  redirect("/admin/bots");
}

export async function deleteBot(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  if (!botId) throw new Error("Bot ID is required.");

  await prisma.bot.delete({ where: { id: botId } });
  redirect("/admin/bots");
}
