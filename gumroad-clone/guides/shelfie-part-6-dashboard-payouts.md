# Shelfie — Part 6: Seller Dashboard, Buyer Dashboard, and Payouts

In this final section, we're going to build the seller dashboard, buyer dashboard, landing page, and connect the payout system.

---

## Seller Dashboard

We need a seller dashboard that shows earnings, sales stats, and a list of all products.

Go to `src/app/sell/dashboard/` and create a file called `page.tsx` with the following content:

```tsx
import Link from "next/link";
import { Plus, DollarSign, ShoppingBag, Package, Heart } from "lucide-react";
import { requireSeller } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { env } from "@/lib/env";
import { ProfileEditor } from "./profile-editor";

export default async function SellerDashboardPage() {
  const { sellerProfile } = await requireSeller();

  const products = await prisma.product.findMany({
    where: { sellerProfileId: sellerProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { purchases: true, likes: true } },
      purchases: { select: { pricePaid: true } },
    },
  });

  const totalSales = products.reduce(
    (sum: number, p) => sum + p._count.purchases, 0
  );
  const totalLikes = products.reduce(
    (sum: number, p) => sum + p._count.likes, 0
  );
  const totalEarnings = products.reduce(
    (sum: number, p) =>
      sum + p.purchases.reduce((s: number, pur) => s + pur.pricePaid, 0),
    0
  );
  const feePercent = env.PLATFORM_FEE_PERCENT;
  const netEarnings = Math.round(totalEarnings * ((100 - feePercent) / 100));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Seller Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            @{sellerProfile.username}
            {sellerProfile.headline && (
              <span className="ml-2">· {sellerProfile.headline}</span>
            )}
          </p>
          <ProfileEditor
            headline={sellerProfile.headline}
            bio={sellerProfile.bio}
          />
        </div>
        <Link href="/sell/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
          <Plus className="h-4 w-4" /> New Product
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-success" />
            <span className="text-sm text-text-secondary">Net Earnings</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {formatPrice(netEarnings)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-accent" />
            <span className="text-sm text-text-secondary">Total Sales</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">{totalSales}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-warning" />
            <span className="text-sm text-text-secondary">Products</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">{products.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-accent" />
            <span className="text-sm text-text-secondary">Total Likes</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">{totalLikes}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-text-primary">Your Products</h2>

        {products.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-text-secondary/30" />
            <p className="mt-4 text-text-secondary">
              No products yet. Create your first product to start selling.
            </p>
            <Link href="/sell/products/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
              <Plus className="h-4 w-4" /> Create Product
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {products.map((product) => {
              const revenue = product.purchases.reduce(
                (s: number, p) => s + p.pricePaid, 0
              );
              return (
                <div key={product.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
                    {product.thumbnailUrl ? (
                      <img src={product.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-6 w-6 text-text-secondary/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{product.title}</p>
                    <p className="text-xs text-text-secondary">
                      {formatPrice(product.price)} · {product._count.purchases} sales · {formatPrice(revenue)} revenue
                    </p>
                  </div>

                  <span className={`px-3 py-1 text-xs font-medium ${
                    product.status === "PUBLISHED"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {product.status}
                  </span>

                  <div className="flex gap-2">
                    <Link href={`/sell/products/${product.id}/edit`}
                      className="rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
                      Edit
                    </Link>
                    {product.status === "PUBLISHED" && (
                      <Link href={`/products/${product.slug}`}
                        className="rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Payouts

Whop handles payouts for us — sellers manage their bank accounts, view their balance, and request withdrawals through Whop's hosted payout portal. We don't need to build any of that.

To send a seller to the payout portal, we generate a temporary link using Whop's account links API. You could add a "Manage Payouts" button to the seller dashboard that runs this code and redirects:

```ts
const accountLink = await getWhop().accountLinks.create({
  company_id: sellerProfile.whopCompanyId,
  use_case: "payouts_portal",
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/sell/dashboard`,
  refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/sell/dashboard?refresh=true`,
});

// Redirect seller to accountLink.url
```

## Seller Profile Editing

Sellers need a way to edit their headline and bio without leaving the dashboard. We need an API route for that.

Go to `src/app/api/sell/profile/` and create a file called `route.ts` with the following content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateProfileSchema = z.object({
  headline: z.string().max(100).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const updated = await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: {
      headline: parsed.data.headline ?? null,
      bio: parsed.data.bio ?? null,
    },
  });

  return NextResponse.json(updated);
}
```

## Buyer Dashboard

We need a buyer dashboard that shows all purchased products with download links. The empty state directs buyers to the marketplace.

Go to `src/app/dashboard/` and create a file called `page.tsx` with the following content:

```tsx
import Link from "next/link";
import { Download, Package, ShoppingBag } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export default async function BuyerDashboardPage() {
  const user = await requireAuth();

  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          sellerProfile: { include: { user: true } },
          _count: { select: { files: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-accent" />
        <h1 className="text-2xl font-bold text-text-primary">My Purchases</h1>
      </div>

      {purchases.length === 0 ? (
        <div className="mt-12 text-center">
          <Package className="mx-auto h-16 w-16 text-text-secondary/20" />
          <p className="mt-4 text-lg text-text-secondary">No purchases yet.</p>
          <Link href="/products"
            className="mt-4 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((purchase) => (
            <div key={purchase.id}
              className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="aspect-[4/3] bg-surface-elevated">
                {purchase.product.thumbnailUrl ? (
                  <img src={purchase.product.thumbnailUrl} alt=""
                    className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-12 w-12 text-text-secondary/20" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text-primary">
                  {purchase.product.title}
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  by @{purchase.product.sellerProfile.username} ·{" "}
                  {formatPrice(purchase.pricePaid)} · {purchase.product._count.files} files
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Purchased{" "}
                  {purchase.createdAt.toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
                <Link href={`/products/${purchase.product.slug}/download`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors">
                  <Download className="h-4 w-4" /> Download
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Landing Page

The landing page needs a hero with search, trending products, category browsing, and a seller CTA.

Go to `src/app/` and create a file called `page.tsx` with the following content:

```tsx
import Link from "next/link";
import { ArrowRight, Store, CreditCard, TrendingUp, Package, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES } from "@/constants/categories";

export default async function HomePage() {
  const trendingProducts = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { likes: { _count: "desc" } },
    take: 8,
    include: {
      sellerProfile: { include: { user: true } },
      ratings: { select: { cookies: true } },
      _count: { select: { likes: true, files: true, ratings: true } },
    },
  });

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/10 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            Sell what you create
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
            The marketplace for digital products — templates, ebooks, design
            assets, and more. Upload your files, set a price, and start earning.
          </p>
          <form
            action="/products"
            method="GET"
            className="mx-auto mt-10 flex max-w-lg items-center border border-border bg-surface"
          >
            <Search className="ml-4 h-4 w-4 text-text-secondary" aria-hidden="true" />
            <input
              type="search"
              name="q"
              placeholder="Search products..."
              className="flex-1 bg-transparent px-3 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
            />
            <button
              type="submit"
              className="bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/products"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Browse All
            </Link>
            <Link href="/sell"
              className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Start Selling <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-text-primary">Trending right now</h2>
        {trendingProducts.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trendingProducts.map((product) => (
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
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-text-secondary/20" />
            <p className="mt-4 text-text-secondary">
              No products yet. Be the first to{" "}
              <Link href="/sell" className="text-accent hover:underline">
                list something
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-text-primary">Browse by category</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link key={cat.value} href={`/products?category=${cat.value}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <cat.icon className="h-8 w-8 text-accent" />
              <span className="text-base font-semibold text-text-primary">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 p-12 text-center">
          <h2 className="text-3xl font-bold text-text-primary">Turn your skills into income</h2>
          <p className="mx-auto mt-4 max-w-lg text-text-secondary">
            Join creators selling digital products on Shelfie. We handle payments, payouts, and compliance — you keep 95% of every sale.
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-accent" /> Free to start
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" /> 5% platform fee
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" /> Instant payouts
            </div>
          </div>
          <Link href="/sell"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
            Start Selling <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
```

---

## Wrapping Up

Shelfie is complete. We built Whop OAuth sign-in, seller onboarding with connected accounts and KYC, product creation with file uploads via UploadThing, a draft-to-publish workflow with Whop checkout configurations, a searchable marketplace with category filters, free and paid purchase flows, webhook-driven payment processing, access-gated file delivery, cookie ratings, and seller and buyer dashboards.

Here are a few ideas to take it further:

- **Subscription products** — recurring payments instead of one-time purchases
- **Coupon codes** — discount codes sellers can create for promotions
- **Rich text editor** — replace the plain text description field with markdown or a WYSIWYG editor
- **File versioning** — let sellers update files while keeping old versions accessible to existing buyers
- **Signed download URLs** — time-limited access URLs instead of public CDN links for tighter security
- **Analytics dashboard** — views, conversion rates, and revenue trends over time

### Get Started

Ready to build your own digital product marketplace? Start with a Whop account at [whop.com](https://whop.com) and get Platforms API access by contacting [sales@whop.com](mailto:sales@whop.com).
