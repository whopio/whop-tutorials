export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/constants";
import { ProductCard } from "@/components/ProductCard";
import { sortByCategoryPriority } from "@/lib/sort-products";

const CATEGORY_ICONS: Record<string, string> = {
  Sneakers: "/images/cat-sneakers.webp",
  Streetwear: "/images/cat-streetwear.webp",
  Electronics: "/images/cat-electronics.webp",
  Collectibles: "/images/cat-collectibles.webp",
  Accessories: "/images/cat-accessories.webp",
  "Trading Cards": "/images/cat-trading-cards.webp",
};

async function getTrendingProducts() {
  const products = await prisma.product.findMany({
    take: 48,
    orderBy: { updatedAt: "desc" },
    include: {
      sizes: {
        select: {
          lowestAsk: true,
          lastSalePrice: true,
        },
      },
    },
  });
  return sortByCategoryPriority(products).slice(0, 12);
}

async function getStats() {
  const [productCount, activeListings, tradesToday] = await Promise.all([
    prisma.product.count(),
    prisma.ask.count({ where: { status: "ACTIVE" } }),
    prisma.trade.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);
  return { productCount, activeListings, tradesToday };
}

export default async function HomePage() {
  const [products, stats] = await Promise.all([
    getTrendingProducts(),
    getStats(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-gray-950 to-gray-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-100 leading-tight">
              The Live{" "}
              <span className="text-brand-500">Marketplace</span>
            </h1>
            <p className="mt-4 text-lg text-gray-400 leading-relaxed">
              Buy and sell sneakers, streetwear, electronics, and collectibles
              at real-time market prices. Every item verified. Every transaction
              protected.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products" className="btn-primary text-base px-8 py-3">
                Browse Products
              </Link>
              <Link
                href="/dashboard"
                className="btn-secondary text-base px-8 py-3"
              >
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-100">
                {stats.productCount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Products</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-100">
                {stats.activeListings.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Active Listings</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-100">
                {stats.tradesToday.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Trades Today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-100">
            Trending Products
          </h2>
          <Link
            href="/products"
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/products?category=${encodeURIComponent(category)}`}
              className="card p-6 text-center hover:border-gray-700 hover:bg-gray-800/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-3">
                <Image
                  src={CATEGORY_ICONS[category] || ""}
                  alt={category}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm font-medium text-gray-300">{category}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
