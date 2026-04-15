import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildPrompt, getModel } from "@/lib/ai";
import { getUserTier, checkGenerationLimit } from "@/lib/tier";

const requestSchema = z.object({
  slug: z.string(),
  inputs: z.record(z.string(), z.string()),
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

  const { slug, inputs } = parsed.data;

  const template = await prisma.template.findUnique({ where: { slug } });
  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Tier gating: block free users from Pro templates
  const tier = await getUserTier(session.userId);
  if (template.tier === "PRO" && tier === "FREE") {
    return NextResponse.json({ error: "Pro template requires upgrade" }, { status: 403 });
  }

  // Daily limit check
  const { allowed } = await checkGenerationLimit(session.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Daily generation limit reached. Upgrade to Pro for unlimited." },
      { status: 429 }
    );
  }

  const inputFields = template.inputFields as unknown as { name: string; label: string }[];
  const prompt = buildPrompt(template.systemPrompt, inputs, inputFields);

  const result = await generateText({
    model: getModel(template.model),
    prompt,
  });

  const firstValue = Object.values(inputs)[0] || "Untitled";
  const title =
    firstValue.length > 50 ? firstValue.slice(0, 47) + "..." : firstValue;

  const generation = await prisma.generation.create({
    data: {
      userId: session.userId,
      templateId: template.id,
      inputs,
      output: result.text,
      title,
    },
  });

  // Prune old generations (keep last 20)
  const generations = await prisma.generation.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (generations.length > 20) {
    const toDelete = generations.slice(20).map((g: { id: string }) => g.id);
    await prisma.generation.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  const updatedLimit = await checkGenerationLimit(session.userId);
  return NextResponse.json({ generationId: generation.id, remaining: updatedLimit.remaining });
}
