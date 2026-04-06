import Link from "next/link";
import { Heart, FileText, Image, Video, ExternalLink } from "lucide-react";
import { CookieDisplay } from "@/components/cookie-rating";
import { formatPrice } from "@/lib/utils";
import { CATEGORY_MAP } from "@/constants/categories";

interface ProductCardProps {
  product: {
    slug: string;
    title: string;
    price: number;
    category: string;
    thumbnailUrl: string | null;
    _count: {
      likes: number;
      files: number;
      ratings?: number;
    };
    avgRating?: number;
    sellerProfile: {
      username: string;
      user: {
        name: string | null;
        avatar: string | null;
      };
    };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const categoryInfo = CATEGORY_MAP[product.category];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-12 w-12 text-text-secondary/30" aria-hidden="true" />
          </div>
        )}

        {/* Price badge */}
        <div className="absolute right-3 top-3">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
              product.price === 0
                ? "bg-success/90 text-white"
                : "bg-black/70 text-white backdrop-blur-sm"
            }`}
          >
            {formatPrice(product.price)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-text-primary">
          {product.title}
        </h3>

        <p className="mt-1 text-sm text-text-secondary">
          by @{product.sellerProfile.username}
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {product._count.likes}
          </span>
          {product.avgRating && product.avgRating > 0 && (
            <CookieDisplay average={product.avgRating} count={product._count.ratings ?? 0} />
          )}
          <span>
            {product._count.files} {product._count.files === 1 ? "file" : "files"}
          </span>
          {categoryInfo && (
            <span className="bg-surface-elevated px-2 py-0.5">
              {categoryInfo.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
