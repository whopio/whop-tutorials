import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWhop } from "@/lib/whop";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

async function setupCourseChat(
  whop: ReturnType<typeof getWhop>,
  companyId: string,
  productId: string,
  courseName: string
): Promise<{ experienceId: string; chatChannelId: string } | null> {
  try {
    // Find the built-in Chat app
    let chatAppId: string | null = null;
    const allApps: string[] = [];
    // Search without verified filter — the Chat app may not be flagged as verified
    for await (const app of whop.apps.list({
      query: "chat",
      first: 20,
    })) {
      allApps.push(`${app.name} (${app.id}, verified=${app.verified})`);
      if (app.name.toLowerCase().includes("chat")) {
        chatAppId = app.id;
        break;
      }
    }
    if (!chatAppId) {
      console.error("[chat-setup] Chat app not found. All apps matching 'chat':", JSON.stringify(allApps));
      return null;
    }
    console.error("[chat-setup] Found Chat app:", chatAppId, "from", allApps.length, "results");

    // Create a Chat experience on the instructor's company
    const experience = await whop.experiences.create({
      app_id: chatAppId,
      company_id: companyId,
      name: `${courseName.slice(0, 50)} Discussion`,
    });
    console.error("[chat-setup] Created experience:", experience.id);

    // Attach the experience to the product so enrolled students get access
    await whop.experiences.attach(experience.id, {
      product_id: productId,
    });
    console.error("[chat-setup] Attached to product:", productId);

    // Find the chat channel created for this experience
    let chatChannelId: string | null = null;
    const allChannels: string[] = [];
    for await (const channel of whop.chatChannels.list({
      company_id: companyId,
      first: 50,
    })) {
      allChannels.push(`${channel.id} (exp: ${channel.experience.id})`);
      if (channel.experience.id === experience.id) {
        chatChannelId = channel.id;
        break;
      }
    }

    if (!chatChannelId) {
      console.error("[chat-setup] Channel not found for experience", experience.id, "Channels:", allChannels);
      return null;
    }

    console.error("[chat-setup] Found channel:", chatChannelId);
    return { experienceId: experience.id, chatChannelId };
  } catch (error) {
    console.error("[chat-setup] Failed (non-blocking):", error);
    return null;
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`teach:publish:${ip}`, { interval: 60_000, maxRequests: 5 });
  if (limited) return limited;

  const user = await requireAuth({ redirect: false });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getCreatorProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Not an instructor" }, { status: 403 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: {
          lessons: { where: { videoReady: true } },
        },
      },
    },
  });

  if (!course || course.creatorId !== profile.id) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (course.status === "PUBLISHED") {
    return NextResponse.json({ error: "Already published" }, { status: 400 });
  }

  const sectionsWithLessons = course.sections.filter(
    (s) => s.lessons.length > 0
  );
  if (sectionsWithLessons.length === 0) {
    return NextResponse.json(
      { error: "Course must have at least one section with a ready video lesson" },
      { status: 400 }
    );
  }

  if (course.price > 0) {
    const whop = getWhop();

    const product = await whop.products.create({
      company_id: profile.whopCompanyId,
      title: course.title.slice(0, 40),
      description: course.description.slice(0, 500),
    });

    const priceInDollars = course.price / 100;
    const plan = await whop.plans.create({
      company_id: profile.whopCompanyId,
      product_id: product.id,
      initial_price: priceInDollars,
      plan_type: "one_time",
    });

    const applicationFee = Math.round(priceInDollars * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;

    const checkout = await whop.checkoutConfigurations.create({
      plan: {
        company_id: profile.whopCompanyId,
        currency: "usd",
        initial_price: priceInDollars,
        plan_type: "one_time",
        application_fee_amount: applicationFee,
      },
      metadata: {
        courstar_course_id: course.id,
      },
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.slug}/learn`,
    });

    // Set up course chat (non-blocking — publish succeeds even if chat fails)
    console.error("[publish] About to call setupCourseChat for paid course, company:", profile.whopCompanyId, "product:", product.id);
    const chat = await setupCourseChat(
      whop,
      profile.whopCompanyId,
      product.id,
      course.title
    );

    await prisma.course.update({
      where: { id: courseId },
      data: {
        status: "PUBLISHED",
        whopProductId: product.id,
        whopPlanId: plan.id,
        whopCheckoutUrl: checkout.purchase_url,
        ...(chat && {
          whopExperienceId: chat.experienceId,
          whopChatChannelId: chat.chatChannelId,
        }),
      },
    });
  } else {
    // Free courses: create product for chat even without payment
    const whop = getWhop();
    let chatData: { whopExperienceId?: string; whopChatChannelId?: string } = {};

    try {
      console.error("[chat-setup] Free course — creating product on company:", profile.whopCompanyId);
      const product = await whop.products.create({
        company_id: profile.whopCompanyId,
        title: course.title.slice(0, 40),
        description: course.description.slice(0, 500),
      });
      console.error("[chat-setup] Product created:", product.id);

      const chat = await setupCourseChat(
        whop,
        profile.whopCompanyId,
        product.id,
        course.title
      );

      if (chat) {
        chatData.whopExperienceId = chat.experienceId;
        chatData.whopChatChannelId = chat.chatChannelId;
      }
    } catch (err) {
      console.error("[chat-setup] Free course chat setup failed:", err);
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { status: "PUBLISHED", ...chatData },
    });
  }

  return NextResponse.json({ success: true });
}
