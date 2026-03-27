import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhop } from "@/lib/whop";

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headerObj = Object.fromEntries(request.headers);

  const whop = getWhop();

  type WhopEvent = {
    type: string;
    id: string;
    data: Record<string, unknown>;
  };

  let webhookData: WhopEvent;
  try {
    webhookData = whop.webhooks.unwrap(bodyText, {
      headers: headerObj,
    }) as unknown as WhopEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.error("[whop-webhook] Received:", webhookData.type, "id:", webhookData.id);

  const existing = await prisma.webhookEvent.findUnique({
    where: { id: webhookData.id },
  });
  if (existing) {
    return NextResponse.json({ received: true });
  }

  await prisma.webhookEvent.create({
    data: { id: webhookData.id, source: "whop" },
  });

  if (webhookData.type === "payment.succeeded") {
    const payment = webhookData.data as {
      id: string;
      plan?: { id: string };
      user?: { id: string; email?: string };
      member?: { id: string; email?: string };
      metadata?: Record<string, string>;
    };

    console.error("[whop-webhook] Payment:", payment.id, "plan:", payment.plan?.id, "user:", payment.user?.id, payment.user?.email, "meta:", JSON.stringify(payment.metadata));

    // Find the course by plan ID or by metadata
    let course = payment.plan?.id
      ? await prisma.course.findFirst({ where: { whopPlanId: payment.plan.id } })
      : null;

    if (!course && payment.metadata?.courstar_course_id) {
      course = await prisma.course.findUnique({
        where: { id: payment.metadata.courstar_course_id },
      });
    }

    if (!course) {
      console.error("[whop-webhook] Course not found");
      return NextResponse.json({ received: true });
    }

    // Find the user by Whop user ID (data.user.id) or email
    const whopUserId = payment.user?.id;
    let user = whopUserId
      ? await prisma.user.findFirst({ where: { whopUserId } })
      : null;

    if (!user && payment.user?.email) {
      user = await prisma.user.findFirst({
        where: { email: payment.user.email },
      });
    }

    // Fallback: try member email
    if (!user && payment.member?.email) {
      user = await prisma.user.findFirst({
        where: { email: payment.member.email },
      });
    }

    if (!user) {
      console.error("[whop-webhook] User not found for:", whopUserId, payment.user?.email);
      return NextResponse.json({ received: true });
    }

    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
      update: { whopPaymentId: payment.id },
      create: {
        userId: user.id,
        courseId: course.id,
        whopPaymentId: payment.id,
      },
    });

    console.error("[whop-webhook] Enrollment created for user:", user.id, "course:", course.id);
  }

  return NextResponse.json({ received: true });
}
