import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductManager from "@/components/dashboard/ProductManager";

export default async function DashboardShopPage() {
  const { creator } = await requireCreator();

  const products = await prisma.product.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
  });

  const initialProducts = products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    type: product.type,
    salesCount: product.salesCount,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="mt-1 text-sm text-muted">
          Sell digital downloads or physical goods. Set a price of $0 to offer something for free.
        </p>
      </div>

      <ProductManager products={initialProducts} />
    </div>
  );
}
