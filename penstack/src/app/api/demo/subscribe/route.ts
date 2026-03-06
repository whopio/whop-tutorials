import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/demo";

const demoSubscribeSchema = z.object({
  writerId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json(
      { error: "Demo mode is not enabled" },
      { status: 403 }
    );
  }

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`demo:subscribe:${user.id}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = demoSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { writerId } = parsed.data;

  const writer = await prisma.writer.findUnique({ where: { id: writerId } });
  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }

  // Check existing subscription
  const existingSub = await prisma.subscription.findUnique({
    where: { userId_writerId: { userId: user.id, writerId } },
  });
  if (existingSub && existingSub.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Already subscribed" },
      { status: 409 }
    );
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId_writerId: { userId: user.id, writerId } },
    update: {
      status: "ACTIVE",
      cancelledAt: null,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    create: {
      userId: user.id,
      writerId,
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Notify writer
  await prisma.notification.create({
    data: {
      userId: writer.userId,
      type: "NEW_SUBSCRIBER",
      title: "New subscriber (demo)",
      message: "Someone subscribed to your publication in demo mode.",
      writerId,
    },
  });

  return NextResponse.json(subscription, { status: 201 });
}
