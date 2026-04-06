# Shelfie — Part 3: Product Listings and File Uploads

Sellers create products by filling out a form, uploading files, and saving as a draft. When they're ready, they publish — which creates a Whop checkout configuration on their connected account and makes the product visible on the marketplace.

---

## File Uploads with UploadThing

We're going to use UploadThing for file uploads. It handles storage, CDN delivery, and size validation — we just define what file types to accept and who can upload.

### Install UploadThing

```bash
npm install uploadthing @uploadthing/react
```

Then add your UploadThing token to Vercel:

1. Go to [uploadthing.com](https://uploadthing.com), create a project
2. Copy the **UPLOADTHING_TOKEN** from your project settings
3. Add it to Vercel: `vercel env add UPLOADTHING_TOKEN` (paste the token, select all environments)
4. Pull it locally: `vercel env pull .env.local`

### File Router

We need to define what types of files sellers can upload, along with size limits and auth checks.

Go to `src/app/api/uploadthing` and create a file called `core.ts` with the content:

```ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSession } from "@/lib/session";

const f = createUploadthing();

export const ourFileRouter = {
  productFile: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    video: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session.userId) throw new UploadThingError("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        name: file.name,
        size: file.size,
        key: file.key,
        url: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

### Route Handler

Go to `src/app/api/uploadthing` and create a file called `route.ts` with the content:

```ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
```

### Client Helper

We need a React hook that lets us trigger file uploads from the browser.

Go to `src/lib` and create a file called `uploadthing.ts` with the content:

```ts
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

## Create Product API Route

When a seller fills out the create form and clicks save, we need to validate the input, generate a unique slug, and save everything as a draft. Prices are stored in cents to avoid floating-point rounding errors.

Go to `src/app/api/sell/products` and create a file called `route.ts` with the content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateSlug } from "@/lib/utils";

const createProductSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  price: z.number().int().min(0),
  category: z.enum([
    "TEMPLATES", "EBOOKS", "SOFTWARE", "DESIGN",
    "AUDIO", "VIDEO", "PHOTOGRAPHY", "EDUCATION", "OTHER",
  ]),
  content: z.string().max(50000).optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  files: z.array(z.object({
    fileName: z.string(),
    fileKey: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number().int(),
    mimeType: z.string(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile || !sellerProfile.kycComplete) {
    return NextResponse.json(
      { error: "Complete seller onboarding first" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, price, category, content, externalUrl, files } =
    parsed.data;

  const slug = generateSlug(title);
  const thumbnailFile = files?.find((f) => f.mimeType.startsWith("image/"));

  const product = await prisma.product.create({
    data: {
      sellerProfileId: sellerProfile.id,
      title,
      slug,
      description,
      price,
      category,
      content: content || null,
      externalUrl: externalUrl || null,
      thumbnailUrl: thumbnailFile?.fileUrl || null,
      files: files
        ? {
            create: files.map((f, i) => ({
              fileName: f.fileName,
              fileKey: f.fileKey,
              fileUrl: f.fileUrl,
              fileSize: f.fileSize,
              mimeType: f.mimeType,
              displayOrder: i,
            })),
          }
        : undefined,
    },
    include: { files: true },
  });

  return NextResponse.json(product, { status: 201 });
}
```

## Update and Delete Product

Sellers need to edit their drafts — change fields, add new files, or remove existing ones. This route handles all three in a single request. Published products can't be edited — the seller must unpublish first.

Go to `src/app/api/sell/products/[productId]` and create a file called `route.ts` with the content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateProductSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(5000).optional(),
  price: z.number().int().min(0).optional(),
  category: z.enum([
    "TEMPLATES", "EBOOKS", "SOFTWARE", "DESIGN",
    "AUDIO", "VIDEO", "PHOTOGRAPHY", "EDUCATION", "OTHER",
  ]).optional(),
  content: z.string().max(50000).optional().nullable(),
  externalUrl: z.string().url().optional().nullable().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().nullable(),
  files: z.array(z.object({
    fileName: z.string(),
    fileKey: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number().int(),
    mimeType: z.string(),
  })).optional(),
  removeFileIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { files: true },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Cannot edit a published product. Unpublish first." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = updateProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { files, removeFileIds, ...fields } = parsed.data;

  if (removeFileIds && removeFileIds.length > 0) {
    await prisma.productFile.deleteMany({
      where: { id: { in: removeFileIds }, productId },
    });
  }

  if (files && files.length > 0) {
    const existingCount = product.files.length - (removeFileIds?.length || 0);
    await prisma.productFile.createMany({
      data: files.map((f, i) => ({
        productId,
        fileName: f.fileName,
        fileKey: f.fileKey,
        fileUrl: f.fileUrl,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        displayOrder: existingCount + i,
      })),
    });
  }

  const newThumbnail = files?.find((f) => f.mimeType.startsWith("image/"));

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...fields,
      externalUrl: fields.externalUrl || null,
      ...(newThumbnail && !product.thumbnailUrl
        ? { thumbnailUrl: newThumbnail.fileUrl }
        : {}),
    },
    include: { files: { orderBy: { displayOrder: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id: productId } });

  return NextResponse.json({ success: true });
}
```

## Publish Product

When a seller clicks Publish, we create a Whop checkout configuration on their connected account and make the product visible on the marketplace. We do this on publish (not on draft creation) because draft products shouldn't have checkout links.

The route uses `getCompanyWhop()` (the company API key) because the app API key doesn't have the permissions needed for product and checkout creation.

Go to `src/app/api/sell/products/[productId]/publish` and create a file called `route.ts` with the content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile || !sellerProfile.kycComplete) {
    return NextResponse.json(
      { error: "Complete seller onboarding first" },
      { status: 403 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { files: true },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Product is already published" },
      { status: 400 }
    );
  }

  // Must have at least one deliverable
  const hasFiles = product.files.length > 0;
  const hasContent = !!product.content;
  const hasLink = !!product.externalUrl;

  if (!hasFiles && !hasContent && !hasLink) {
    return NextResponse.json(
      {
        error:
          "Product must have at least one file, text content, or external link",
      },
      { status: 400 }
    );
  }

  try {
    // Create Whop product on the seller's connected account
    const whopProduct = await getCompanyWhop().products.create({
      company_id: sellerProfile.whopCompanyId,
      title: product.title,
      description: product.description,
    });

    const feePercent = env.PLATFORM_FEE_PERCENT;

    // Free products don't need a checkout configuration
    if (product.price === 0) {
      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          status: "PUBLISHED",
          whopProductId: whopProduct.id,
        },
      });

      return NextResponse.json(updated);
    }

    const feeAmount = Math.round(product.price * (feePercent / 100));

    // Create a checkout configuration with an inline plan and application fee.
    // company_id goes on the plan only, NOT on the top-level config.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutConfig = await (getCompanyWhop().checkoutConfigurations.create as any)({
      plan: {
        company_id: sellerProfile.whopCompanyId,
        currency: "usd",
        initial_price: product.price / 100,
        plan_type: "one_time",
        application_fee_amount: feeAmount / 100,
      },
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: "PUBLISHED",
        whopProductId: whopProduct.id,
        whopPlanId: checkoutConfig.plan?.id ?? null,
        whopCheckoutUrl: checkoutConfig.purchase_url,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Publish error:", err);
    const message = err instanceof Error ? err.message : "Whop API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

## Create Product Page

We need a form where sellers enter product details and upload files. Products are saved as drafts.

Go to `src/app/sell/products/new` and create a file called `page.tsx` with the content:

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Check, Loader2 } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { formatFileSize } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
];
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB

interface UploadedFile {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const { startUpload, isUploading } = useUploadThing("productFile", {
    onClientUploadComplete: (res) => {
      const uploaded = res.map((file) => ({
        fileName: file.name,
        fileKey: file.key,
        fileUrl: file.url,
        fileSize: file.size,
        mimeType: "",
      }));
      setFiles((prev) => [...prev, ...uploaded]);
    },
    onUploadError: (err) => {
      setError(err.message || "Upload failed");
    },
  });

  function removeFile(fileKey: string) {
    setFiles((prev) => prev.filter((f) => f.fileKey !== fileKey));
  }

  async function handleFiles(fileList: FileList) {
    setError(null);

    const validFiles: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name}: file type not allowed`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: exceeds 16 MB limit`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const res = await startUpload(validFiles);
    if (res) {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.mimeType) return f;
          const original = validFiles.find((v) => v.name === f.fileName);
          return original ? { ...f, mimeType: original.type } : f;
        })
      );
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const priceStr = formData.get("price") as string;
    const priceInCents = Math.round(parseFloat(priceStr || "0") * 100);

    const body = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      price: priceInCents,
      category: formData.get("category") as string,
      content: (formData.get("content") as string) || undefined,
      externalUrl: (formData.get("externalUrl") as string) || undefined,
      files: files.length > 0 ? files : undefined,
    };

    try {
      const res = await fetch("/api/sell/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create product");
        return;
      }

      const product = await res.json();
      router.push(`/sell/products/${product.id}/edit`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Create a New Product
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Fill in the details, upload your files, and publish when ready.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-text-primary"
          >
            Title
          </label>
          <input
            type="text" id="title" name="title" required maxLength={100}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="e.g. Premium Icon Pack"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-text-primary"
          >
            Description
          </label>
          <textarea
            id="description" name="description" required rows={4} maxLength={5000}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="Describe what buyers will get..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-text-primary">
              Price (USD)
            </label>
            <input
              type="number" id="price" name="price" min="0" step="0.01" defaultValue="0"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="0.00 for free"
            />
            <p className="mt-1 text-xs text-text-secondary">
              Set to 0 for a free product
            </p>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-text-primary">
              Category
            </label>
            <select
              id="category" name="category" required
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary">Files</label>
          <p className="mt-0.5 text-xs text-text-secondary">
            PDF, images (PNG, JPG, GIF, WebP), video (MP4). Max 16 MB each.
          </p>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div key={file.fileKey} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="flex-1 truncate text-sm text-text-primary">{file.fileName}</span>
                  <span className="text-xs text-text-secondary">{formatFileSize(file.fileSize)}</span>
                  <button type="button" onClick={() => removeFile(file.fileKey)} aria-label={`Remove ${file.fileName}`} className="p-2 text-text-secondary hover:text-error transition-colors">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden="true" />
              <span className="text-sm text-text-secondary">Uploading...</span>
            </div>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.dataset.dragging = "true"; }}
            onDragLeave={(e) => { delete e.currentTarget.dataset.dragging; }}
            onDrop={(e) => {
              e.preventDefault();
              delete e.currentTarget.dataset.dragging;
              if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-accent/50 data-[dragging]:border-accent data-[dragging]:bg-accent/5"
          >
            <Upload className="h-8 w-8 text-text-secondary" aria-hidden="true" />
            <span className="text-sm text-text-secondary">Click or drag files to upload</span>
            <input
              ref={fileInputRef} type="file" multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-text-primary">
            Text Content <span className="text-text-secondary">(optional)</span>
          </label>
          <textarea
            id="content" name="content" rows={6}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 font-mono text-sm"
            placeholder="Add text or markdown content that buyers will see after purchase..."
          />
        </div>

        <div>
          <label htmlFor="externalUrl" className="block text-sm font-medium text-text-primary">
            External Link <span className="text-text-secondary">(optional)</span>
          </label>
          <input
            type="url" id="externalUrl" name="externalUrl"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="https://..."
          />
        </div>

        <button
          type="submit" disabled={loading || isUploading}
          className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Product (Draft)"}
        </button>
      </form>
    </div>
  );
}
```

## Edit and Publish Page

The edit page needs two modes: a full edit form for drafts, and a read-only summary for published products.

Go to `src/app/sell/products/[productId]/edit` and create a file called `page.tsx` with the content:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";
import { formatPrice, formatFileSize } from "@/lib/utils";
import { PublishButton } from "./publish-button";
import { UnpublishButton } from "./unpublish-button";
import { DeleteButton } from "./delete-button";
import { EditForm } from "./edit-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const { sellerProfile } = await requireSeller();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { files: { orderBy: { displayOrder: "asc" } } },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/sell/dashboard"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {product.status === "DRAFT" ? "Edit Product" : product.title}
          </h1>
          <p className="text-sm text-text-secondary">
            {formatPrice(product.price)} ·{" "}
            <span className={product.status === "PUBLISHED" ? "text-success" : "text-warning"}>
              {product.status}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {product.status === "DRAFT" && (
            <>
              <DeleteButton productId={product.id} />
              <PublishButton productId={product.id} />
            </>
          )}

          {product.status === "PUBLISHED" && (
            <>
              <UnpublishButton productId={product.id} />
              <Link href={`/products/${product.slug}`}
                className="border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                View Live
              </Link>
            </>
          )}
        </div>
      </div>

      {product.status === "DRAFT" && (
        <EditForm
          product={{
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            content: product.content,
            externalUrl: product.externalUrl,
            thumbnailUrl: product.thumbnailUrl,
            files: product.files,
          }}
        />
      )}

      {product.status === "PUBLISHED" && (
        <div className="mt-8 space-y-6">
          {product.thumbnailUrl && (
            <div className="overflow-hidden">
              <img src={product.thumbnailUrl} alt={product.title}
                className="w-full object-cover max-h-64" />
            </div>
          )}

          <div className="border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">Description</h2>
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{product.description}</p>
          </div>

          <div className="border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">Files ({product.files.length})</h2>
            {product.files.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">No files uploaded yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {product.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 bg-surface-elevated p-3">
                    <span className="flex-1 truncate text-sm text-text-primary">{file.fileName}</span>
                    <span className="text-xs text-text-secondary">{formatFileSize(file.fileSize)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {product.content && (
            <div className="border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary">Text Content</h2>
              <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{product.content}</p>
            </div>
          )}

          {product.externalUrl && (
            <div className="border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary">External Link</h2>
              <p className="mt-2 text-sm text-accent">{product.externalUrl}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

We'll make the publish button a separate client component so it can show error tooltips without refreshing the page.

Go to `src/app/sell/products/[productId]/edit` and create a file called `publish-button.tsx` with the content:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";

export function PublishButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handlePublish() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sell/products/${productId}/publish`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to publish");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button onClick={handlePublish} disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-white hover:bg-success/90 transition-colors disabled:opacity-50">
        <Rocket className="h-4 w-4" />
        {loading ? "Publishing..." : "Publish"}
      </button>
      {error && (
        <div role="alert"
          className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-xs text-error shadow-lg backdrop-blur-sm">
          {error}
        </div>
      )}
    </div>
  );
}
```

## Unpublish and Delete

Sellers need to be able to take products offline (unpublish) and delete drafts. Both use a two-click confirmation to prevent accidents. Unpublishing clears the checkout URL so the old link stops working, but existing buyers keep their access.

Go to `src/app/api/sell/products/[productId]/unpublish` and create a file called `route.ts` with the content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Product is not published" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      status: "DRAFT",
      whopCheckoutUrl: null,
    },
  });

  return NextResponse.json(updated);
}
```

## Thumbnail Upload

The edit form includes a separate thumbnail upload field. Sellers can upload, remove, and replace thumbnails — these show on product cards in the marketplace.

## Checkpoint

You can now:

1. Navigate to `/sell/products/new`
2. Fill in title, description, price, category
3. Create the product (saved as DRAFT)
4. Land on the edit page — an editable form with all fields and file upload
5. Upload files, edit any field, click "Save Changes"
6. Click "Publish" — a Whop checkout configuration is created on the seller's connected account
7. The product is now PUBLISHED and visible on the marketplace

Next up — **Part 4: Marketplace and Discovery** — where buyers browse, search, filter by category, view product details, and like products.
