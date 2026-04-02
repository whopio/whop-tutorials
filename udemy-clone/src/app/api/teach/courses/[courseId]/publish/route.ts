import { NextResponse } from "next/server";
import { requireAuth, getCreatorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWhop } from "@/lib/whop";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

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



    await prisma.course.update({
      where: { id: courseId },
      data: {
        status: "PUBLISHED",
        whopProductId: product.id,
        whopPlanId: plan.id,
        whopCheckoutUrl: checkout.purchase_url,
      },
    });
  } else {
    await prisma.course.update({
      where: { id: courseId },
      data: { status: "PUBLISHED" },
    });
  }

  return NextResponse.json({ success: true });
}
