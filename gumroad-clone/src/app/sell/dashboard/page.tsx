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

  const totalSales = products.reduce((sum: number, p) => sum + p._count.purchases, 0);
  const totalLikes = products.reduce((sum: number, p) => sum + p._count.likes, 0);
  const totalEarnings = products.reduce(
    (sum: number, p) => sum + p.purchases.reduce((s: number, pur) => s + pur.pricePaid, 0),
    0
  );
  const feePercent = env.PLATFORM_FEE_PERCENT;
  const netEarnings = Math.round(totalEarnings * ((100 - feePercent) / 100));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Seller Dashboard
          </h1>
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
        <Link
          href="/sell/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      {/* Stats */}
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
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {totalSales}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-warning" />
            <span className="text-sm text-text-secondary">Products</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {products.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-accent" />
            <span className="text-sm text-text-secondary">Total Likes</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {totalLikes}
          </p>
        </div>
      </div>

      {/* Product list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-text-primary">
          Your Products
        </h2>

        {products.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-text-secondary/30" />
            <p className="mt-4 text-text-secondary">
              No products yet. Create your first product to start selling.
            </p>
            <Link
              href="/sell/products/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Product
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {products.map((product) => {
              const revenue = product.purchases.reduce(
                (s, p) => s + p.pricePaid,
                0
              );
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  {/* Thumbnail */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
                    {product.thumbnailUrl ? (
                      <img
                        src={product.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-6 w-6 text-text-secondary/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {product.title}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatPrice(product.price)} ·{" "}
                      {product._count.purchases} sales · {formatPrice(revenue)}{" "}
                      revenue
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`px-3 py-1 text-xs font-medium ${
                      product.status === "PUBLISHED"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {product.status}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/sell/products/${product.id}/edit`}
                      className="rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Edit
                    </Link>
                    {product.status === "PUBLISHED" && (
                      <Link
                        href={`/products/${product.slug}`}
                        className="rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                      >
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
