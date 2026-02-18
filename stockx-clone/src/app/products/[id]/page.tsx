export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductDetail } from "@/components/ProductDetail";

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      sizes: {
        orderBy: { size: "asc" },
        include: {
          trades: {
            select: { price: true, createdAt: true },
            orderBy: { createdAt: "asc" },
            take: 100,
          },
        },
      },
    },
  });
  return product;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const allTrades = product.sizes.flatMap((s) =>
    s.trades.map((t) => ({
      price: t.price,
      createdAt: t.createdAt.toISOString(),
    }))
  );

  const totalSales = product.sizes.reduce((sum, s) => sum + s.salesCount, 0);
  const avgPrice =
    allTrades.length > 0
      ? allTrades.reduce((sum, t) => sum + t.price, 0) / allTrades.length
      : null;
  const lastSale =
    allTrades.length > 0 ? allTrades[allTrades.length - 1].price : null;
  const premiumDiscount =
    lastSale !== null
      ? (((lastSale - product.retailPrice) / product.retailPrice) * 100).toFixed(0)
      : null;

  const serializedSizes = product.sizes.map((s) => ({
    id: s.id,
    size: s.size,
    lowestAsk: s.lowestAsk,
    highestBid: s.highestBid,
    lastSalePrice: s.lastSalePrice,
    salesCount: s.salesCount,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductDetail
        product={{
          id: product.id,
          name: product.name,
          brand: product.brand,
          sku: product.sku,
          description: product.description,
          images: product.images,
          retailPrice: product.retailPrice,
          category: product.category,
        }}
        sizes={serializedSizes}
        trades={allTrades}
        marketSummary={{
          lastSale,
          avgPrice,
          totalSales,
          premiumDiscount,
        }}
      />
    </div>
  );
}
