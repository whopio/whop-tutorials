import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Image as ImageIcon, Video, ExternalLink, Download, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { formatPrice, formatFileSize } from "@/lib/utils";
import { LikeButton } from "@/components/like-button";
import { CookieRating } from "@/components/cookie-rating";
import { CATEGORY_MAP } from "@/constants/categories";

const FILE_ICONS: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "image/": ImageIcon,
  "video/": Video,
};

function getFileIcon(mimeType: string) {
  for (const [prefix, icon] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(prefix)) return icon;
  }
  return FileText;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      sellerProfile: { include: { user: true } },
      files: { orderBy: { displayOrder: "asc" } },
      ratings: { select: { cookies: true } },
      _count: { select: { likes: true, purchases: true, ratings: true } },
    },
  });

  if (!product || product.status !== "PUBLISHED") notFound();

  const user = await getAuthUser();

  // Check if user has purchased
  const purchase = user
    ? await prisma.purchase.findUnique({
        where: {
          userId_productId: { userId: user.id, productId: product.id },
        },
      })
    : null;

  // Check if user has liked
  const liked = user
    ? !!(await prisma.like.findUnique({
        where: {
          userId_productId: { userId: user.id, productId: product.id },
        },
      }))
    : false;

  // User's rating
  const userRating = user
    ? await prisma.rating.findUnique({
        where: { userId_productId: { userId: user.id, productId: product.id } },
      })
    : null;

  const avgRating =
    product._count.ratings > 0
      ? product.ratings.reduce((sum, r) => sum + r.cookies, 0) / product._count.ratings
      : 0;

  const categoryInfo = CATEGORY_MAP[product.category];
  const seller = product.sellerProfile;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 lg:pb-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Content column */}
        <div>
          {/* Thumbnail */}
          {product.thumbnailUrl && (
            <div className="overflow-hidden rounded-xl">
              <img
                src={product.thumbnailUrl}
                alt={product.title}
                className="w-full object-cover"
              />
            </div>
          )}

          <h1 className="mt-6 text-3xl font-bold text-text-primary">
            {product.title}
          </h1>

          {/* Seller byline */}
          <Link
            href={`/sellers/${seller.username}`}
            className="mt-3 inline-flex items-center gap-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {seller.user.avatar && (
              <img
                src={seller.user.avatar}
                alt={seller.user.name || "Seller avatar"}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div>
              <span className="font-medium">@{seller.username}</span>
              {seller.headline && (
                <span className="ml-2 text-text-secondary">
                  · {seller.headline}
                </span>
              )}
            </div>
          </Link>

          {/* Like + category */}
          <div className="mt-4 flex items-center gap-3">
            {user ? (
              <LikeButton
                productId={product.id}
                initialLiked={liked}
                initialCount={product._count.likes}
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                ♥ {product._count.likes}
              </span>
            )}
            {categoryInfo && (
              <span className="bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary">
                {categoryInfo.label}
              </span>
            )}
            <span className="text-xs text-text-secondary">
              {product._count.purchases} sales
            </span>
          </div>

          {/* Cookie Rating */}
          <div className="mt-3">
            <CookieRating
              productId={product.id}
              initialRating={userRating?.cookies ?? null}
              averageRating={avgRating}
              ratingCount={product._count.ratings}
              canRate={!!purchase}
            />
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text-primary">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-text-secondary leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* What's included */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text-primary">
              What&apos;s included
            </h2>
            <div className="mt-3 space-y-2">
              {product.files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
                  >
                    <Icon className="h-5 w-5 text-text-secondary" />
                    <span className="flex-1 text-sm font-medium text-text-primary">
                      {file.fileName}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatFileSize(file.fileSize)}
                    </span>
                    <Lock className="h-4 w-4 text-text-secondary/50" aria-hidden="true" />
                  </div>
                );
              })}

              {product.content && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <FileText className="h-5 w-5 text-text-secondary" />
                  <span className="flex-1 text-sm font-medium text-text-primary">
                    Text content included
                  </span>
                  <Lock className="h-4 w-4 text-text-secondary/50" />
                </div>
              )}

              {product.externalUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <ExternalLink className="h-5 w-5 text-text-secondary" />
                  <span className="flex-1 text-sm font-medium text-text-primary">
                    External resource link
                  </span>
                  <Lock className="h-4 w-4 text-text-secondary/50" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Purchase card — desktop sidebar */}
        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-center text-3xl font-bold text-text-primary">
              {formatPrice(product.price)}
            </p>

            {purchase ? (
              <Link
                href={`/products/${product.slug}/download`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-success px-6 py-3 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </Link>
            ) : product.price === 0 ? (
              <form action={`/api/products/${product.id}/purchase`} method="POST">
                <button
                  type="submit"
                  className="mt-6 w-full rounded-lg bg-success px-6 py-3 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
                >
                  Get for Free
                </button>
              </form>
            ) : product.whopCheckoutUrl ? (
              <a
                href={product.whopCheckoutUrl}
                className="mt-6 flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                Buy Now
              </a>
            ) : null}

            <div className="mt-4 text-center text-xs text-text-secondary">
              {product.files.length} {product.files.length === 1 ? "file" : "files"} · Instant download
            </div>
          </div>
        </div>
      </div>

      {/* Mobile purchase bar — fixed at bottom */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-lg font-bold text-text-primary">
            {formatPrice(product.price)}
          </p>
          {purchase ? (
            <Link
              href={`/products/${product.slug}/download`}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-6 py-2.5 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </Link>
          ) : product.price === 0 ? (
            <form action={`/api/products/${product.id}/purchase`} method="POST">
              <button
                type="submit"
                className="rounded-lg bg-success px-6 py-2.5 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
              >
                Get for Free
              </button>
            </form>
          ) : product.whopCheckoutUrl ? (
            <a
              href={product.whopCheckoutUrl}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Buy Now
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
