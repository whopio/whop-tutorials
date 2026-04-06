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
    (sum: number, p) => sum + p._count.purchases,
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Profile header */}
      <div className="rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 p-8">
        <div className="flex items-center gap-6">
          {sellerProfile.user.avatar && (
            <img
              src={sellerProfile.user.avatar}
              alt={sellerProfile.user.name || "Seller avatar"}
              className="h-20 w-20 rounded-full border-4 border-surface"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {sellerProfile.user.name || `@${sellerProfile.username}`}
            </h1>
            <p className="text-sm text-text-secondary">
              @{sellerProfile.username}
            </p>
            {sellerProfile.headline && (
              <p className="mt-1 text-sm text-text-secondary">
                {sellerProfile.headline}
              </p>
            )}
          </div>
        </div>

        {sellerProfile.bio && (
          <p className="mt-4 max-w-2xl text-sm text-text-secondary leading-relaxed">
            {sellerProfile.bio}
          </p>
        )}

        <div className="mt-4 flex gap-6 text-sm text-text-secondary">
          <span>
            <strong className="text-text-primary">
              {sellerProfile.products.length}
            </strong>{" "}
            products
          </span>
          <span>
            <strong className="text-text-primary">{totalSales}</strong> sales
          </span>
        </div>
      </div>

      {/* Products */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-text-primary">Products</h2>
        {sellerProfile.products.length === 0 ? (
          <p className="mt-4 text-text-secondary">
            No products published yet.
          </p>
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
