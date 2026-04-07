import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileText, Image as ImageIcon, Video, ExternalLink, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatFileSize } from "@/lib/utils";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Video;
  return FileText;
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAuth();

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      files: { orderBy: { displayOrder: "asc" } },
      sellerProfile: { include: { user: true } },
    },
  });

  if (!product) notFound();

  // Verify purchase
  const purchase = await prisma.purchase.findUnique({
    where: {
      userId_productId: { userId: user.id, productId: product.id },
    },
  });

  if (!purchase) {
    redirect(`/products/${slug}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/products/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to product
      </Link>

      <div className="mt-6">
        <p className="text-sm font-medium text-success">Purchase confirmed</p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">
          {product.title}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          by @{product.sellerProfile.username}
        </p>
      </div>

      {/* Files */}
      {product.files.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary">Files</h2>
          <div className="mt-3 space-y-2">
            {product.files.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4"
                >
                  <Icon className="h-5 w-5 text-text-secondary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatFileSize(file.fileSize)} · {file.mimeType}
                    </p>
                  </div>
                  <a
                    href={file.fileUrl}
                    download={file.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${file.fileName}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Text content */}
      {product.content && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary">Content</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-6">
            <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
              {product.content}
            </div>
          </div>
        </div>
      )}

      {/* External link */}
      {product.externalUrl && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary">
            External Resource
          </h2>
          <a
            href={product.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-accent hover:bg-surface-elevated transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
            <span className="text-sm font-medium">{product.externalUrl}</span>
          </a>
        </div>
      )}
    </div>
  );
}
