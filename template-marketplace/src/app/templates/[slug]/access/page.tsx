import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Star,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toolByValue } from "@/constants/categories";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TemplateAccessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAuth();

  const template = await prisma.template.findUnique({
    where: { slug },
    include: {
      sellerProfile: { select: { username: true, headline: true } },
      files: { orderBy: { displayOrder: "asc" } },
    },
  });
  if (!template) notFound();

  // Buyers retain access to PUBLISHED and ARCHIVED templates they own. DRAFTs
  // never have purchases, so the check below catches them.
  const purchase = await prisma.purchase.findUnique({
    where: { userId_templateId: { userId: user.id, templateId: template.id } },
  });
  if (!purchase) {
    // Redirect to the public sales page when it's still browseable; otherwise
    // 404 since there's nothing for the visitor to see here.
    if (template.status === "PUBLISHED") {
      redirect(`/templates/${template.slug}`);
    }
    notFound();
  }

  const existingReview = await prisma.review.findUnique({
    where: { userId_templateId: { userId: user.id, templateId: template.id } },
    select: { stars: true },
  });

  const tool = toolByValue(template.tool);
  const downloadFiles = template.files.filter((f) => f.kind === "DOWNLOAD");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to your library
      </Link>

      <div className="mt-6 flex items-start gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-success)]/15 text-[var(--color-success)]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You own this template
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            {template.title}
          </h1>
          <Link
            href={`/sellers/${template.sellerProfile.username}`}
            className="mt-1 inline-block text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
          >
            by{" "}
            <span className="font-medium text-[var(--color-text-primary)]">
              @{template.sellerProfile.username}
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {template.deliveryType === "SHARE_URL" && template.shareUrl ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                {tool.label} share URL
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Open the link below to duplicate the template into your own workspace.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                href={template.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                Open template
                <ExternalLink className="h-4 w-4" />
              </a>
              <code className="overflow-hidden truncate rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                {template.shareUrl}
              </code>
            </div>
          </section>
        ) : null}

        {template.deliveryType === "FILE_DOWNLOAD" && downloadFiles.length > 0 ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                Download files
              </h2>
            </div>
            <ul className="mt-3 divide-y divide-[var(--color-border)]">
              {downloadFiles.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
                    {f.mimeType.startsWith("image/") ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      title={f.fileName}
                      className="truncate text-sm font-medium text-[var(--color-text-primary)]"
                    >
                      {f.fileName}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {formatBytes(f.fileSize)}
                    </p>
                  </div>
                  <a
                    href={f.fileUrl}
                    download={f.fileName}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {template.content ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
              Setup notes
            </h2>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {template.content}
            </div>
          </section>
        ) : null}
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-[var(--color-rating)]/15 text-[var(--color-rating)]">
            <Star className="h-4 w-4 fill-current" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
              {existingReview ? "Update your review" : "Help other buyers"}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {existingReview
                ? `You rated this ${existingReview.stars}/5. You can edit your review any time.`
                : "Share what worked and what could be better. Reviews are visible on the template's public page."}
            </p>
          </div>
          <Link
            href={`/templates/${template.slug}/review/new`}
            className="flex-shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
          >
            {existingReview ? "Edit review" : "Write a review"}
          </Link>
        </div>
      </section>

      <p className="mt-8 text-xs text-[var(--color-text-secondary)]">
        Purchased{" "}
        {purchase.createdAt.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        .
      </p>
    </main>
  );
}
