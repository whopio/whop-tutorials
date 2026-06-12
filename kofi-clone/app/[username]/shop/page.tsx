import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSandbox } from "@/lib/env";
import CreatorProfileHeader from "@/components/creator/CreatorProfileHeader";
import ShopGrid from "@/components/creator/ShopGrid";

export default async function ShopPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username },
    select: {
      id: true,
      displayName: true,
      accentColor: true,
      isActive: true,
      products: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, priceCents: true, imageUrl: true, salesCount: true },
      },
    },
  });
  if (!creator || !creator.isActive) notFound();

  return (
    <>
      <CreatorProfileHeader username={username} />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-xl font-bold">Shop</h1>
        <p className="mt-1 text-sm text-muted">Grab something from {creator.displayName}&rsquo;s shop and back their work.</p>

        <div className="mt-5">
          {creator.products.length === 0 ? (
            <div className="kofi-card p-8 text-center">
              <p className="text-sm text-muted">{creator.displayName} hasn&apos;t added any products yet.</p>
            </div>
          ) : (
            <ShopGrid
              products={creator.products}
              creatorUsername={username}
              creatorDisplayName={creator.displayName}
              accentColor={creator.accentColor}
              sandbox={isSandbox()}
            />
          )}
        </div>
      </div>
    </>
  );
}
