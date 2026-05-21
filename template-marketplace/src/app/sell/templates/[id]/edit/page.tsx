import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireSeller } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateForm, type TemplateFormState } from "@/components/TemplateForm";
import { TemplateFileUploader } from "@/components/TemplateFileUploader";
import { PublishButton } from "@/components/PublishButton";
import { ArchiveButton } from "@/components/ArchiveButton";
import { DeleteButton } from "@/components/DeleteButton";
import { PromoCodesPanel } from "@/components/PromoCodesPanel";

function statusLabel(status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
  }
}

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditTemplateSkeleton />}>
      <EditTemplateContent params={params} />
    </Suspense>
  );
}

function EditTemplateSkeleton() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-surface-elevated)]" />
      <div className="mt-4 h-10 w-80 animate-pulse rounded-lg bg-[var(--color-surface-elevated)]" />
      <div className="mt-8 h-96 animate-pulse rounded-2xl bg-[var(--color-surface-elevated)]" />
    </main>
  );
}

async function EditTemplateContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { seller } = await requireSeller();

  const template = await prisma.template.findFirst({
    where: { id, sellerProfileId: seller.id },
    include: {
      files: { orderBy: { displayOrder: "asc" } },
      _count: { select: { purchases: true } },
    },
  });
  if (!template) notFound();

  const previewFiles = template.files.filter((f) => f.kind === "PREVIEW");
  const downloadFiles = template.files.filter((f) => f.kind === "DOWNLOAD");
  const isPublished = template.status === "PUBLISHED";
  const isArchived = template.status === "ARCHIVED";
  const purchaseCount = template._count.purchases;
  const canHardDelete = purchaseCount === 0;

  const initial: TemplateFormState = {
    title: template.title,
    description: template.description,
    priceDollars: (template.price / 100).toFixed(2),
    tool: template.tool,
    category: template.category,
    deliveryType: template.deliveryType,
    shareUrl: template.shareUrl ?? "",
    content: template.content ?? "",
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        href="/sell/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Edit template · {statusLabel(template.status)}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {template.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {template.whopCheckoutUrl && isPublished && (
            <a
              href={template.whopCheckoutUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)]"
            >
              View checkout
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {(isPublished || isArchived) && (
            <ArchiveButton templateId={template.id} isArchived={isArchived} />
          )}
          {!isArchived && (
            <PublishButton
              templateId={template.id}
              alreadyPublished={isPublished}
            />
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TemplateForm templateId={template.id} initial={initial} />

        <aside className="min-w-0 space-y-8">
          <section>
            <h2 className="font-display text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
              Preview images
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Up to 6 images, 8 MB each. The first becomes the thumbnail.
            </p>
            <div className="mt-3">
              <TemplateFileUploader
                templateId={template.id}
                kind="preview"
                files={previewFiles}
              />
            </div>
          </section>

          {template.deliveryType === "FILE_DOWNLOAD" && (
            <section>
              <h2 className="font-display text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                Downloadable files
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Up to 10 files, 16 MB each. Revealed only after purchase.
              </p>
              <div className="mt-3">
                <TemplateFileUploader
                  templateId={template.id}
                  kind="downloadable"
                  files={downloadFiles}
                />
              </div>
            </section>
          )}

          <section id="promo-codes">
            <h2 className="font-display text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
              Promo codes
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Issue percentage or flat-amount discounts. Buyers redeem them at
              checkout.
            </p>
            <div className="mt-3">
              <PromoCodesPanel
                templateId={template.id}
                isPublished={template.status === "PUBLISHED" && !!template.whopProductId}
              />
            </div>
          </section>
        </aside>
      </div>

      <section
        id="danger-zone"
        className="mt-16 rounded-2xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-5"
      >
        <h2 className="font-display text-base font-semibold tracking-tight text-[var(--color-error)]">
          Danger zone
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {canHardDelete
            ? "No purchases yet. You can permanently delete this template."
            : `${purchaseCount} ${purchaseCount === 1 ? "buyer has" : "buyers have"} purchased this template. Hard delete is blocked so they keep access. Archive it to take it off the marketplace without breaking past purchases.`}
        </p>
        <div className="mt-4">
          <DeleteButton templateId={template.id} templateTitle={template.title} />
        </div>
      </section>
    </main>
  );
}
