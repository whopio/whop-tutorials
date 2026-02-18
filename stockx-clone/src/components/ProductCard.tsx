"use client";

import Link from "next/link";
import Image from "next/image";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    brand: string;
    images: string[];
    category: string;
    sizes: { lowestAsk: number | null; lastSalePrice: number | null }[];
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const lowestAsk = product.sizes.reduce<number | null>((min, size) => {
    if (size.lowestAsk === null) return min;
    if (min === null) return size.lowestAsk;
    return size.lowestAsk < min ? size.lowestAsk : min;
  }, null);

  const lastSale = product.sizes.find((s) => s.lastSalePrice !== null)
    ?.lastSalePrice;

  const imageUrl = product.images[0] || "https://placehold.co/400x400/1f2937/6b7280?text=No+Image";

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="card overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 hover:border-gray-700">
        <div className="relative aspect-square bg-gray-800 overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {product.brand}
          </p>
          <h3 className="text-sm font-medium text-gray-100 line-clamp-2 leading-snug min-h-[2.5rem]">
            {product.name}
          </h3>
          <div className="pt-2">
            {lowestAsk !== null ? (
              <>
                <p className="text-xs text-gray-500">Lowest Ask</p>
                <p className="text-lg font-bold text-brand-500">
                  ${lowestAsk.toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">No Asks</p>
            )}
            {lastSale != null && (
              <p className="text-xs text-gray-500 mt-1">
                Last Sale: ${lastSale.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
