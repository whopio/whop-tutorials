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
      {/* Search + Filters */}
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

        {/* Category pills */}
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

      {/* Product grid */}
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

      {/* Pagination */}
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
