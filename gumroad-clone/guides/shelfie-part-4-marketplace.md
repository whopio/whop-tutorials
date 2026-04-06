# Shelfie — Part 4: Marketplace and Discovery

In this section, we're going to build the buyer-facing side of the app: a searchable product catalog, product detail pages, seller profiles, a like system, and cookie ratings.

---

## Schema Update: Ratings

Likes tell you a product is popular, but not whether it's *good*. We need a rating system so buyers can share quality signals after they've purchased a product.

Go to `prisma/` and update `schema.prisma` by adding the following model:

```prisma
model Rating {
  id        String   @id @default(cuid())
  userId    String
  productId String
  cookies   Float // 0.5-5 in 0.5 increments
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}
```

Then add the relation field to both existing models:

```prisma
model User {
  // ... existing fields
  ratings Rating[]
}

model Product {
  // ... existing fields
  ratings Rating[]
}
```

Run the migration:

```bash
npx prisma generate && npx prisma db push
```

---

## Product Card

We need a reusable product card that appears on the homepage, catalog, and seller profiles.

Go to `src/components/` and create a file called `product-card.tsx` with the following content:

```tsx
import Link from "next/link";
import { Heart, FileText, Image, Video, ExternalLink } from "lucide-react";
import { CookieDisplay } from "@/components/cookie-rating";
import { formatPrice } from "@/lib/utils";
import { CATEGORY_MAP } from "@/constants/categories";

interface ProductCardProps {
  product: {
    slug: string;
    title: string;
    price: number;
    category: string;
    thumbnailUrl: string | null;
    _count: {
      likes: number;
      files: number;
      ratings?: number;
    };
    avgRating?: number;
    sellerProfile: {
      username: string;
      user: {
        name: string | null;
        avatar: string | null;
      };
    };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const categoryInfo = CATEGORY_MAP[product.category];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-12 w-12 text-text-secondary/30" aria-hidden="true" />
          </div>
        )}

        <div className="absolute right-3 top-3">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
              product.price === 0
                ? "bg-success/90 text-white"
                : "bg-black/70 text-white backdrop-blur-sm"
            }`}
          >
            {formatPrice(product.price)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-text-primary">
          {product.title}
        </h3>

        <p className="mt-1 text-sm text-text-secondary">
          by @{product.sellerProfile.username}
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {product._count.likes}
          </span>
          {product.avgRating && product.avgRating > 0 && (
            <CookieDisplay average={product.avgRating} count={product._count.ratings ?? 0} />
          )}
          <span>
            {product._count.files} {product._count.files === 1 ? "file" : "files"}
          </span>
          {categoryInfo && (
            <span className="bg-surface-elevated px-2 py-0.5">
              {categoryInfo.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

## Browse Marketplace

The marketplace page will have a search bar, category filter pills, a product grid, and pagination.

Go to `src/app/products/` and create a file called `page.tsx` with the following content:

```tsx
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES } from "@/constants/categories";
import { Search } from "lucide-react";
import Link from "next/link";
import type { Category, Prisma } from "@/generated/prisma/client";

const PRODUCTS_PER_PAGE = 12;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { category, q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1"));

  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    ...(category && { category: category as Category }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PRODUCTS_PER_PAGE,
      take: PRODUCTS_PER_PAGE,
      include: {
        sellerProfile: { include: { user: true } },
        ratings: { select: { cookies: true } },
        _count: { select: { likes: true, files: true, ratings: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <form role="search" aria-label="Search products" className="relative">
          <label htmlFor="product-search" className="sr-only">Search products</label>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <input
            type="search"
            id="product-search"
            name="q"
            defaultValue={q}
            placeholder="Search digital products..."
            className="w-full rounded-xl border border-border bg-surface py-3.5 pl-12 pr-4 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {category && <input type="hidden" name="category" value={category} />}
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/products"
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              !category
                ? "bg-accent text-white"
                : "bg-surface-elevated text-text-secondary hover:text-text-primary"
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/products?category=${cat.value}${q ? `&q=${q}` : ""}`}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                category === cat.value
                  ? "bg-accent text-white"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-lg text-text-secondary">No products found.</p>
          <Link href="/products" className="mt-2 text-sm text-accent hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                avgRating:
                  product._count.ratings > 0
                    ? product.ratings.reduce((s, r) => s + r.cookies, 0) / product._count.ratings
                    : 0,
              }}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/products?page=${p}${category ? `&category=${category}` : ""}${q ? `&q=${q}` : ""}`}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? "page" : undefined}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                p === currentPage
                  ? "bg-accent text-white"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Product Detail Page

This is where buyers decide whether to purchase. We need to show the description, file list, seller info, cookie ratings, and a purchase card.

Go to `src/app/products/[slug]/` and create a file called `page.tsx` with the following content:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Image as ImageIcon, Video, ExternalLink, Download, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { formatPrice, formatFileSize } from "@/lib/utils";
import { LikeButton } from "@/components/like-button";
import { CookieRating } from "@/components/cookie-rating";
import { CATEGORY_MAP } from "@/constants/categories";

const FILE_ICONS: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "image/": ImageIcon,
  "video/": Video,
};

function getFileIcon(mimeType: string) {
  for (const [prefix, icon] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(prefix)) return icon;
  }
  return FileText;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      sellerProfile: { include: { user: true } },
      files: { orderBy: { displayOrder: "asc" } },
      ratings: { select: { cookies: true } },
      _count: { select: { likes: true, purchases: true, ratings: true } },
    },
  });

  if (!product || product.status !== "PUBLISHED") notFound();

  const user = await getAuthUser();

  // Check if user has purchased
  const purchase = user
    ? await prisma.purchase.findUnique({
        where: {
          userId_productId: { userId: user.id, productId: product.id },
        },
      })
    : null;

  // Check if user has liked
  const liked = user
    ? !!(await prisma.like.findUnique({
        where: {
          userId_productId: { userId: user.id, productId: product.id },
        },
      }))
    : false;

  // User's rating
  const userRating = user
    ? await prisma.rating.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      })
    : null;

  const avgRating =
    product._count.ratings > 0
      ? product.ratings.reduce((sum, r) => sum + r.cookies, 0) / product._count.ratings
      : 0;

  const categoryInfo = CATEGORY_MAP[product.category];
  const seller = product.sellerProfile;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 lg:pb-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {product.thumbnailUrl && (
            <div className="overflow-hidden rounded-xl">
              <img
                src={product.thumbnailUrl}
                alt={product.title}
                className="w-full object-cover"
              />
            </div>
          )}

          <h1 className="mt-6 text-3xl font-bold text-text-primary">
            {product.title}
          </h1>

          <Link
            href={`/sellers/${seller.username}`}
            className="mt-3 inline-flex items-center gap-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {seller.user.avatar && (
              <img
                src={seller.user.avatar}
                alt={seller.user.name || "Seller avatar"}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div>
              <span className="font-medium">@{seller.username}</span>
              {seller.headline && (
                <span className="ml-2 text-text-secondary">
                  · {seller.headline}
                </span>
              )}
            </div>
          </Link>

          <div className="mt-4 flex items-center gap-3">
            {user ? (
              <LikeButton
                productId={product.id}
                initialLiked={liked}
                initialCount={product._count.likes}
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                ♥ {product._count.likes}
              </span>
            )}
            {categoryInfo && (
              <span className="bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary">
                {categoryInfo.label}
              </span>
            )}
            <span className="text-xs text-text-secondary">
              {product._count.purchases} sales
            </span>
          </div>

          <div className="mt-3">
            <CookieRating
              productId={product.id}
              initialRating={userRating?.cookies ?? null}
              averageRating={avgRating}
              ratingCount={product._count.ratings}
              canRate={!!purchase}
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text-primary">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-text-secondary leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text-primary">
              What&apos;s included
            </h2>
            <div className="mt-3 space-y-2">
              {product.files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
                  >
                    <Icon className="h-5 w-5 text-text-secondary" />
                    <span className="flex-1 text-sm font-medium text-text-primary">
                      {file.fileName}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatFileSize(file.fileSize)}
                    </span>
                    <Lock className="h-4 w-4 text-text-secondary/50" aria-hidden="true" />
                  </div>
                );
              })}

              {product.content && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <FileText className="h-5 w-5 text-text-secondary" />
                  <span className="flex-1 text-sm font-medium text-text-primary">
                    Text content included
                  </span>
                  <Lock className="h-4 w-4 text-text-secondary/50" />
                </div>
              )}

              {product.externalUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <ExternalLink className="h-5 w-5 text-text-secondary" />
                  <span className="flex-1 text-sm font-medium text-text-primary">
                    External resource link
                  </span>
                  <Lock className="h-4 w-4 text-text-secondary/50" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-center text-3xl font-bold text-text-primary">
              {formatPrice(product.price)}
            </p>

            {purchase ? (
              <Link
                href={`/products/${product.slug}/download`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-success px-6 py-3 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </Link>
            ) : product.price === 0 ? (
              <form action={`/api/products/${product.id}/purchase`} method="POST">
                <button
                  type="submit"
                  className="mt-6 w-full rounded-lg bg-success px-6 py-3 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
                >
                  Get for Free
                </button>
              </form>
            ) : product.whopCheckoutUrl ? (
              <a
                href={product.whopCheckoutUrl}
                className="mt-6 flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                Buy Now
              </a>
            ) : null}

            <div className="mt-4 text-center text-xs text-text-secondary">
              {product.files.length} {product.files.length === 1 ? "file" : "files"} · Instant download
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-lg font-bold text-text-primary">
            {formatPrice(product.price)}
          </p>
          {purchase ? (
            <Link
              href={`/products/${product.slug}/download`}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-6 py-2.5 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </Link>
          ) : product.price === 0 ? (
            <form action={`/api/products/${product.id}/purchase`} method="POST">
              <button
                type="submit"
                className="rounded-lg bg-success px-6 py-2.5 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
              >
                Get for Free
              </button>
            </form>
          ) : product.whopCheckoutUrl ? (
            <a
              href={product.whopCheckoutUrl}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Buy Now
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

## Like Button

On top of the rating system, we'll add a like system so that buyers can quickly show appreciation for a product without committing to a full rating.

Go to `src/components/` and create a file called `like-button.tsx` with the following content:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  productId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ productId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    startTransition(async () => {
      const res = await fetch(`/api/products/${productId}/like`, { method: "POST" });
      if (!res.ok) {
        setLiked(liked);
        setCount(count);
      }
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
        liked
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-border bg-surface text-text-secondary hover:border-accent/30 hover:text-accent"
      )}>
      <Heart className={cn("h-4 w-4 transition-transform", liked && "fill-current scale-110")} aria-hidden="true" />
      {count}
    </button>
  );
}
```

We also need an API route that toggles the like on and off.

Go to `src/app/api/products/[productId]/like/` and create a file called `route.ts` with the following content:

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

  const existingLike = await prisma.like.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });

  if (existingLike) {
    await prisma.like.delete({ where: { id: existingLike.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.like.create({ data: { userId: session.userId, productId } });
  return NextResponse.json({ liked: true });
}
```

## Cookie Rating

Instead of stars, buyers rate products with cookies — a small brand touch that makes the experience memorable.

### Rate API Route

We need an API endpoint that validates the rating value (must be 0.5-5 in 0.5 increments), checks for a purchase, and upserts the rating.

Go to `src/app/api/products/[productId]/rate/` and create a file called `route.ts` with the following content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const VALID_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const rateSchema = z.object({
  cookies: z.number().refine((v) => VALID_RATINGS.includes(v), {
    message: "Rating must be 0.5-5 in 0.5 increments",
  }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purchase = await prisma.purchase.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });
  if (!purchase) {
    return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const rating = await prisma.rating.upsert({
    where: { userId_productId: { userId: session.userId, productId } },
    create: { userId: session.userId, productId, cookies: parsed.data.cookies },
    update: { cookies: parsed.data.cookies },
  });

  return NextResponse.json(rating);
}
```

### Cookie Rating Component

We need a component that renders custom SVG cookies with three states: full, half-bitten, and empty.

Go to `src/components/` and create a file called `cookie-rating.tsx` with the following content:

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Full cookie — round with chocolate chips
function CookieFull({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" fill="var(--color-surface)" />
      <circle cx="14" cy="7" r="1.2" fill="var(--color-surface)" />
      <circle cx="10" cy="13" r="1.3" fill="var(--color-surface)" />
      <circle cx="15" cy="14" r="1.5" fill="var(--color-surface)" />
      <circle cx="7" cy="15" r="1" fill="var(--color-surface)" />
      <circle cx="16" cy="10" r="1" fill="var(--color-surface)" />
    </svg>
  );
}

// Half-eaten cookie — large bite from right side, clearly visible at small sizes
function CookieHalf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M12 2 A10 10 0 1 0 19 18 A7 7 0 0 1 19 6 A10 10 0 0 0 12 2z"
        fill="currentColor"
      />
      <circle cx="6.5" cy="9" r="1.5" fill="var(--color-surface)" />
      <circle cx="10" cy="15" r="1.4" fill="var(--color-surface)" />
      <circle cx="5" cy="14.5" r="1" fill="var(--color-surface)" />
      <circle cx="21" cy="9" r="0.8" fill="currentColor" />
      <circle cx="22" cy="13" r="0.6" fill="currentColor" />
      <circle cx="20" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}

// Empty cookie — just outline
function CookieEmpty({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="14" cy="7" r="1.2" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="10" cy="13" r="1.3" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="15" cy="14" r="1.5" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="7" cy="15" r="1" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

interface CookieRatingProps {
  productId: string;
  initialRating: number | null;
  averageRating: number;
  ratingCount: number;
  canRate: boolean;
}

export function CookieRating({
  productId,
  initialRating,
  averageRating,
  ratingCount,
  canRate,
}: CookieRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRate(cookies: number) {
    if (!canRate || saving) return;
    setSaving(true);
    setRating(cookies);

    try {
      const res = await fetch(`/api/products/${productId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies }),
      });
      if (!res.ok) setRating(initialRating);
    } catch {
      setRating(initialRating);
    } finally {
      setSaving(false);
    }
  }

  function renderCookie(position: number, value: number) {
    const full = position;
    const half = position - 0.5;

    if (value >= full) {
      return <CookieFull className="h-full w-full" />;
    } else if (value >= half) {
      return <CookieHalf className="h-full w-full" />;
    }
    return <CookieEmpty className="h-full w-full" />;
  }

  // Display-only mode
  if (!canRate) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((pos) => (
            <div
              key={pos}
              className={cn(
                "h-6 w-6",
                Math.round(averageRating * 2) / 2 >= pos - 0.5
                  ? "text-warning"
                  : "text-border"
              )}
            >
              {renderCookie(pos, Math.round(averageRating * 2) / 2)}
            </div>
          ))}
        </div>
        <span className="text-xs text-text-secondary">
          {averageRating > 0 ? averageRating.toFixed(1) : "No ratings"}{" "}
          {ratingCount > 0 && `(${ratingCount})`}
        </span>
      </div>
    );
  }

  // Interactive mode
  const display = hover ?? rating ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((pos) => (
          <div key={pos} className="relative h-7 w-7">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleRate(pos - 0.5)}
              onMouseEnter={() => setHover(pos - 0.5)}
              onMouseLeave={() => setHover(null)}
              aria-label={`Rate ${pos - 0.5} cookies`}
              className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => handleRate(pos)}
              onMouseEnter={() => setHover(pos)}
              onMouseLeave={() => setHover(null)}
              aria-label={`Rate ${pos} cookies`}
              className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
            />
            <div
              className={cn(
                "h-full w-full pointer-events-none transition-colors",
                display >= pos - 0.5 ? "text-warning" : "text-border"
              )}
            >
              {renderCookie(pos, display)}
            </div>
          </div>
        ))}
      </div>
      <span className="text-xs text-text-secondary">
        {rating
          ? `${rating} cookie${rating !== 1 ? "s" : ""}`
          : "Rate this product"}
      </span>
    </div>
  );
}

// Compact display for product cards
export function CookieDisplay({
  average,
  count,
}: {
  average: number;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1">
      <CookieFull className="h-3.5 w-3.5 text-warning" />
      <span className="text-xs text-text-secondary">
        {average.toFixed(1)}
      </span>
    </div>
  );
}
```

The product detail page shown above already includes the `CookieRating` component with the rating queries and render logic inline.

## Seller Profile Page

We need a public seller profile page where anyone can see a seller's info and browse their published products.

Go to `src/app/sellers/[username]/` and create a file called `page.tsx` with the following content:

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { username },
    include: {
      user: true,
      products: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: {
          sellerProfile: { include: { user: true } },
          _count: { select: { likes: true, files: true, purchases: true } },
        },
      },
    },
  });

  if (!sellerProfile) notFound();

  const totalSales = sellerProfile.products.reduce(
    (sum: number, p) => sum + p._count.purchases, 0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 p-8">
        <div className="flex items-center gap-6">
          {sellerProfile.user.avatar && (
            <img src={sellerProfile.user.avatar} alt={sellerProfile.user.name || "Seller avatar"}
              className="h-20 w-20 rounded-full border-4 border-surface" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {sellerProfile.user.name || `@${sellerProfile.username}`}
            </h1>
            <p className="text-sm text-text-secondary">@{sellerProfile.username}</p>
            {sellerProfile.headline && (
              <p className="mt-1 text-sm text-text-secondary">{sellerProfile.headline}</p>
            )}
          </div>
        </div>
        {sellerProfile.bio && (
          <p className="mt-4 max-w-2xl text-sm text-text-secondary leading-relaxed">
            {sellerProfile.bio}
          </p>
        )}
        <div className="mt-4 flex gap-6 text-sm text-text-secondary">
          <span><strong className="text-text-primary">{sellerProfile.products.length}</strong> products</span>
          <span><strong className="text-text-primary">{totalSales}</strong> sales</span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-text-primary">Products</h2>
        {sellerProfile.products.length === 0 ? (
          <p className="mt-4 text-text-secondary">No products published yet.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sellerProfile.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Checkpoint

Test the marketplace end-to-end:

1. Navigate to `/products` — you should see your published products. Try searching by title and filtering by category
2. Click a product to open `/products/[slug]` — verify the description, file list, seller info, and purchase card are all showing
3. Click the heart icon to like a product — the count should update instantly
4. Visit `/sellers/[username]` — the seller's profile should show their published products and stats
5. If you have a purchased product, try clicking the cookies on the product detail page to leave a rating

Next up — **Part 5: Checkout, Payments, and File Delivery** — where buyers pay for products and download what they bought.
