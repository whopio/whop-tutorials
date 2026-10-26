import { NextRequest, NextResponse } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headerObj = Object.fromEntries(request.headers);

  type WhopEvent = { type: string; id: string; data: Record<string, unknown> };

  let webhookData: WhopEvent;
  try {
    webhookData = unwrapWebhook<WhopEvent>(bodyText, {
      headers: headerObj,
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const existing = await prisma.webhookEvent.findUnique({ where: { id: webhookData.id } });
  if (existing) return NextResponse.json({ received: true });

  await prisma.webhookEvent.create({ data: { id: webhookData.id, source: "whop" } });

  if (webhookData.type === "payment.succeeded") {
    const payment = webhookData.data as {
      id: string;
      plan_id?: string;
      plan?: { id: string };
      user?: { id: string; email?: string };
      metadata?: Record<string, string>;
    };

    // Depending on the webhook's API version, Whop sends the plan as a flat
    // plan_id or as a nested plan object, so we read both.
    const planId = payment.plan_id ?? payment.plan?.id;

    let course = planId
      ? await prisma.course.findFirst({ where: { whopPlanId: planId } })
      : null;

    if (!course && payment.metadata?.courstar_course_id) {
      course = await prisma.course.findUnique({
        where: { id: payment.metadata.courstar_course_id },
      });
    }

    if (course) {
      const whopUserId = payment.user?.id;
      let user = whopUserId
        ? await prisma.user.findFirst({ where: { whopUserId } })
        : null;

      if (!user && payment.user?.email) {
        user = await prisma.user.findFirst({ where: { email: payment.user.email } });
      }

      if (user) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          update: { whopPaymentId: payment.id },
          create: { userId: user.id, courseId: course.id, whopPaymentId: payment.id },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
