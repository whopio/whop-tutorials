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
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/10 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            Sell what you create
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
            The marketplace for digital products — templates, ebooks, design
            assets, and more. Upload your files, set a price, and start earning.
          </p>
          {/* Search */}
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
            <Link
              href="/products"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Browse All
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Start Selling
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-text-primary">
          Trending right now
        </h2>
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

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-text-primary">
          Browse by category
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/products?category=${cat.value}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <cat.icon className="h-8 w-8 text-accent" />
              <span className="text-base font-semibold text-text-primary">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Seller CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 p-12 text-center">
          <h2 className="text-3xl font-bold text-text-primary">
            Turn your skills into income
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-text-secondary">
            Join creators selling digital products on Shelfie. We handle
            payments, payouts, and compliance — you keep 95% of every sale.
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-accent" />
              Free to start
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              5% platform fee
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Instant payouts
            </div>
          </div>
          <Link
            href="/sell"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Start Selling
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
