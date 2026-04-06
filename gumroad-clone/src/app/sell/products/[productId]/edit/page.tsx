// src/app/sell/products/[productId]/edit/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSeller } from "@/lib/auth";
import { formatPrice, formatFileSize } from "@/lib/utils";
import { PublishButton } from "@/components/publish-button";
import { UnpublishButton } from "@/components/unpublish-button";
import { DeleteButton } from "@/components/delete-button";
import { EditForm } from "@/components/edit-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const { sellerProfile } = await requireSeller();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { files: { orderBy: { displayOrder: "asc" } } },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/sell/dashboard"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {product.status === "DRAFT" ? "Edit Product" : product.title}
          </h1>
          <p className="text-sm text-text-secondary">
            {formatPrice(product.price)} ·{" "}
            <span
              className={
                product.status === "PUBLISHED"
                  ? "text-success"
                  : "text-warning"
              }
            >
              {product.status}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {product.status === "DRAFT" && (
            <>
              <DeleteButton productId={product.id} />
              <PublishButton productId={product.id} />
            </>
          )}

          {product.status === "PUBLISHED" && (
            <>
              <UnpublishButton productId={product.id} />
              <Link
                href={`/products/${product.slug}`}
                className="border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                View Live
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Draft: editable form */}
      {product.status === "DRAFT" && (
        <EditForm
          product={{
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            content: product.content,
            externalUrl: product.externalUrl,
            thumbnailUrl: product.thumbnailUrl,
            files: product.files,
          }}
        />
      )}

      {/* Published: read-only view */}
      {product.status === "PUBLISHED" && (
        <div className="mt-8 space-y-6">
          {product.thumbnailUrl && (
            <div className="overflow-hidden">
              <img
                src={product.thumbnailUrl}
                alt={product.title}
                className="w-full object-cover max-h-64"
              />
            </div>
          )}

          <div className="border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">
              Description
            </h2>
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          <div className="border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">
              Files ({product.files.length})
            </h2>
            {product.files.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">
                No files uploaded yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {product.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 bg-surface-elevated p-3"
                  >
                    <span className="flex-1 truncate text-sm text-text-primary">
                      {file.fileName}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatFileSize(file.fileSize)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {product.content && (
            <div className="border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary">
                Text Content
              </h2>
              <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
                {product.content}
              </p>
            </div>
          )}

          {product.externalUrl && (
            <div className="border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary">
                External Link
              </h2>
              <p className="mt-2 text-sm text-accent">{product.externalUrl}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
