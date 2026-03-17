"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function deleteConversation(conversationId: string) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== user.id) {
    throw new Error("Conversation not found");
  }

  await prisma.conversation.delete({ where: { id: conversationId } });
  redirect("/chat");
}

const renameSchema = z.object({
  title: z.string().min(1).max(100),
});

export async function renameConversation(
  conversationId: string,
  title: string
) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const parsed = renameSchema.parse({ title: title.trim() });

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== user.id) {
    throw new Error("Conversation not found");
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title: parsed.title },
  });
}
