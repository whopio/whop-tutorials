import { NextRequest, NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl, whopCompany } from "@/lib/whop";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.template.findFirst({
    where: { id, sellerProfile: { userId: session.userId } },
    include: {
      sellerProfile: true,
      files: true,
    },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Validation, surface every problem at once
  const issues: string[] = [];
  if (!template.title?.trim()) issues.push("Title is required");
  if (!template.description?.trim()) issues.push("Description is required");
  const previews = template.files.filter((f) => f.kind === "PREVIEW");
  if (previews.length === 0) issues.push("At least one preview image is required");
  if (template.deliveryType === "FILE_DOWNLOAD") {
    const downloads = template.files.filter((f) => f.kind === "DOWNLOAD");
    if (downloads.length === 0) {
      issues.push("File-download templates need at least one downloadable file");
    }
  } else {
    if (!template.shareUrl?.trim()) {
      issues.push("Share-URL templates need a non-empty share URL");
    }
  }
  if (issues.length > 0) {
    return NextResponse.json({ error: "Not ready to publish", issues }, { status: 400 });
  }

  // Free templates skip Whop entirely
  if (template.price === 0) {
    const updated = await prisma.template.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });
    updateTag("templates");
    updateTag(`template:${updated.slug}`);
    return NextResponse.json({ ok: true, template: updated });
  }

  const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT ?? "5", 10);
  const feeAmountCents = Math.round((template.price * platformFeePercent) / 100);

  try {
    // 1. Create the Whop product on the seller's connected company
    const whopProduct = await whopCompany.products.create({
      company_id: template.sellerProfile.whopCompanyId,
      title: template.title,
      description: template.description,
    });

    // 2. Create a checkout configuration with an inline one-time plan.
    // redirect_url sends the buyer to our access page after a successful
    // checkout instead of Whop's default `whop.com/joined/...` page.
    const checkoutConfig = await whopCompany.checkoutConfigurations.create({
      mode: "payment",
      redirect_url: `${appUrl}/templates/${template.slug}/access`,
      plan: {
        company_id: template.sellerProfile.whopCompanyId,
        product_id: whopProduct.id,
        currency: "usd",
        initial_price: template.price / 100,
        plan_type: "one_time",
        application_fee_amount: feeAmountCents / 100,
        // Whop caps plan title at 30 chars; the product title (shown on
        // the public product page) keeps the full text.
        title: template.title.slice(0, 30),
      },
    });

    const updated = await prisma.template.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        whopProductId: whopProduct.id,
        whopPlanId: checkoutConfig.plan?.id ?? null,
        whopCheckoutUrl: checkoutConfig.purchase_url,
      },
    });

    // A newly-published template needs to show up in the catalog and on the
    // detail page right away — bust both list and per-template caches.
    updateTag("templates");
    updateTag(`template:${updated.slug}`);

    return NextResponse.json({ ok: true, template: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    console.error("Publish failed", { templateId: id, status, message });
    return NextResponse.json(
      { error: "Publish failed", detail: message.slice(0, 500), status },
      { status: 500 },
    );
  }
}
