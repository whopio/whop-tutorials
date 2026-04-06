# Shelfie — Part 5: Checkout, Payments, and File Delivery

In this section, we're going to build the purchase flow. Free products create a purchase record instantly, and paid products go through Whop's hosted checkout.

---

## How Payment Flows Through the System

When a buyer clicks "Buy Now":

1. The browser navigates to the `whopCheckoutUrl` stored on the Product record
2. The buyer completes payment on Whop's hosted checkout page
3. Whop splits the payment: 5% to your platform account, 95% to the seller's connected account
4. Whop fires a `payment.succeeded` webhook to your `/api/webhooks/whop` endpoint
5. Your webhook handler creates a `Purchase` record

## Free Product Purchase

Free products don't need Whop checkout — we just create a Purchase record directly and redirect to the download page. The route enforces that the product is actually free and that the user hasn't already purchased it.

Go to `src/app/api/products/[productId]/purchase/` and create a file called `route.ts` with the following content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

// Free product purchase — paid products go through Whop checkout + webhook
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.price !== 0) {
    return NextResponse.json(
      { error: "This product requires payment. Use the checkout link." },
      { status: 400 }
    );
  }

  // Check if already purchased
  const existingPurchase = await prisma.purchase.findUnique({
    where: {
      userId_productId: {
        userId: session.userId,
        productId,
      },
    },
  });

  if (existingPurchase) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/products/${product.slug}/download`
    );
  }

  await prisma.purchase.create({
    data: {
      userId: session.userId,
      productId,
      pricePaid: 0,
    },
  });

  // Redirect to the download page — the form POSTs here via native HTML,
  // so the browser follows the redirect automatically.
  return NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/products/${product.slug}/download`
  );
}
```

## Webhook Setup

Before building the webhook handler, you need to register a webhook in Whop and get the signing secret.

1. Go to your Whop sandbox dashboard (sandbox.whop.com) > Developer > Webhooks
2. Click "Create webhook"
3. Set the destination URL to `https://your-vercel-url.vercel.app/api/webhooks/whop`
4. Select the `payment.succeeded` event
5. Copy the webhook secret → `WHOP_WEBHOOK_SECRET`
6. Add to Vercel and `vercel env pull .env.local`

## Webhook Handler

The webhook handler verifies the request signature, checks idempotency (webhooks can be delivered more than once), and creates a `Purchase` record.

Go to `src/app/api/webhooks/whop/` and create a file called `route.ts` with the following content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhop } from "@/lib/whop";

type WhopEvent = {
  type: string;
  id: string;
  data: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headerObj = Object.fromEntries(request.headers);

  const whop = getWhop();

  let webhookData: WhopEvent;
  try {
    webhookData = whop.webhooks.unwrap(bodyText, {
      headers: headerObj,
    }) as unknown as WhopEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    // Fallback: try parsing raw JSON if signature verification fails
    try {
      webhookData = JSON.parse(bodyText) as WhopEvent;
    } catch {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }
  }

  const eventId = webhookData.id;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  // Idempotency — skip if already processed
  const existing = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (existing) {
    return NextResponse.json({ status: "already_processed" });
  }

  if (webhookData.type === "payment.succeeded") {
    const payment = webhookData.data;
    const plan = payment?.plan as Record<string, unknown> | undefined;
    const user = payment?.user as Record<string, unknown> | undefined;
    const planId = plan?.id as string | undefined;
    const whopUserId = user?.id as string | undefined;

    if (!planId || !whopUserId) {
      console.error("Missing plan or user on payment webhook:", JSON.stringify(webhookData.data, null, 2));
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Find the product by the plan ID stored during publish
    const product = await prisma.product.findFirst({
      where: { whopPlanId: planId },
    });

    if (!product) {
      console.error("No product found for plan:", planId);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Find the buyer by their Whop user ID
    const dbUser = await prisma.user.findUnique({
      where: { whopUserId },
    });

    if (!dbUser) {
      console.error("No user found for Whop user:", whopUserId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create purchase (upsert to handle duplicate webhooks gracefully)
    await prisma.purchase.upsert({
      where: {
        userId_productId: {
          userId: dbUser.id,
          productId: product.id,
        },
      },
      update: {},
      create: {
        userId: dbUser.id,
        productId: product.id,
        whopPaymentId: payment.id as string,
        pricePaid: Math.round(((payment.subtotal as number) ?? 0) * 100),
      },
    });

    // Mark event as processed
    await prisma.webhookEvent.create({ data: { id: eventId } });
  }

  return NextResponse.json({ status: "ok" });
}
```

## Configurable Platform Fee

The platform fee is configurable via the `PLATFORM_FEE_PERCENT` environment variable — the default is 5%, matching Gumroad's pricing. To change it:

```
PLATFORM_FEE_PERCENT=10  # 10% platform fee
```

Whop deducts this fee from each payment and sends it to your platform's balance. The remaining amount goes to the seller's connected account.

## File Delivery

Now that buyers can purchase products, we need a download page where they access what they bought. The page checks whether the user has purchased the product before showing any files — if they haven't, they get redirected.

Go to `src/app/products/[slug]/download/` and create a file called `page.tsx` with the following content:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileText, Image as ImageIcon, Video, ExternalLink, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatFileSize } from "@/lib/utils";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Video;
  return FileText;
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAuth();

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      files: { orderBy: { displayOrder: "asc" } },
      sellerProfile: { include: { user: true } },
    },
  });

  if (!product) notFound();

  const purchase = await prisma.purchase.findUnique({
    where: { userId_productId: { userId: user.id, productId: product.id } },
  });

  if (!purchase) {
    redirect(`/products/${slug}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/products/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to product
      </Link>

      <div className="mt-6">
        <p className="text-sm font-medium text-success">Purchase confirmed</p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">{product.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          by @{product.sellerProfile.username}
        </p>
      </div>

      {product.files.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary">Files</h2>
          <div className="mt-3 space-y-2">
            {product.files.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              return (
                <div key={file.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
                  <Icon className="h-5 w-5 text-text-secondary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{file.fileName}</p>
                    <p className="text-xs text-text-secondary">
                      {formatFileSize(file.fileSize)} · {file.mimeType}
                    </p>
                  </div>
                  <a href={file.fileUrl} download={file.fileName}
                    target="_blank" rel="noopener noreferrer"
                    aria-label={`Download ${file.fileName}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors">
                    <Download className="h-4 w-4" aria-hidden="true" /> Download
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {product.content && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary">Content</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-6">
            <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
              {product.content}
            </div>
          </div>
        </div>
      )}

      {product.externalUrl && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary">External Resource</h2>
          <a href={product.externalUrl} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-accent hover:bg-surface-elevated transition-colors">
            <ExternalLink className="h-5 w-5" />
            <span className="text-sm font-medium">{product.externalUrl}</span>
          </a>
        </div>
      )}
    </div>
  );
}
```

## Checkpoint

Test the full purchase and download flow:

1. Create a free product, publish it, then click "Get for Free" — you should be redirected to the download page immediately
2. Create a paid product, publish it, sign in as a different user (or use incognito), and click "Buy Now"
3. Complete payment on Whop's checkout (test card: `4242 4242 4242 4242`, any future date, any CVC)
4. Navigate back to the product page — the button should now say "Download"
5. Click "Download" and verify you see the files, text content, and external links
6. Open an incognito window and try the download URL without signing in — you should be redirected to sign-in
7. Sign in as a user who hasn't purchased — you should be redirected to the product page

Next up — **Part 6: Seller Dashboard and Payouts** — where sellers track earnings, manage products, and withdraw money.
