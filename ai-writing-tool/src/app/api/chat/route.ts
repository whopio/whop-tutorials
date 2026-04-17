import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getModel } from "@/lib/ai";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  generationId: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { messages, generationId } = parsed.data;

  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    include: { template: true },
  });

  if (!generation || generation.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Save the new user message (last in the array)
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage.role === "user") {
    await prisma.message.create({
      data: {
        generationId,
        role: "USER",
        content: lastUserMessage.content,
      },
    });
  }

  const systemPrompt = `${generation.template.systemPrompt}

The user previously generated the following content:

${generation.output}

The user will ask you to revise the content. Maintain the same format and style while applying their feedback.`;

  const result = streamText({
    model: getModel(generation.template.model),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      await prisma.message.create({
        data: {
          generationId,
          role: "ASSISTANT",
          content: text,
        },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
