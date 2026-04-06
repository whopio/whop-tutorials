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
          <p className="mt-4 text-lg text-text-secondary">
            No purchases yet.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-surface-elevated">
                {purchase.product.thumbnailUrl ? (
                  <img
                    src={purchase.product.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
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
                  {formatPrice(purchase.pricePaid)} ·{" "}
                  {purchase.product._count.files} files
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Purchased{" "}
                  {purchase.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                <Link
                  href={`/products/${purchase.product.slug}/download`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
