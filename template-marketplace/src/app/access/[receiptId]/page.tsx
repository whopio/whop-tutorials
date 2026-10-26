import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toolByValue } from "@/constants/categories";
import { ProcessingAccess } from "./ProcessingAccess";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Receipt-keyed download page. Public, no auth.
 *
 * Reachable two ways:
 *  1. Right after checkout, via the CheckoutModal success panel
 *     (`onComplete(planId, receiptId)` hands us the receipt).
 *  2. From Whop's automatic receipt email, hours or days later.
 *
 * Identity check: we look up the Purchase by `whopPaymentId`. The
 * `payment.succeeded` webhook creates that row (and upserts a User keyed
 * by `whopUserId` for anonymous buyers), so possession of the receipt ID
 * is sufficient — the actual verification happened webhook-side, signed
 * by Whop. Same security model as Stripe receipts or Gumroad download
 * links.
 *
 * Webhook can race the success redirect by a couple seconds. When the
 * Purchase row isn't there yet we render <ProcessingAccess>, which
 * router.refresh()es every 2s until the row appears.
 */
export default function ReceiptAccessPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  return (
    <Suspense fallback={<AccessSkeleton />}>
      <ReceiptAccessContent params={params} />
    </Suspense>
  );
}

function AccessSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-surface-elevated)]" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded-lg bg-[var(--color-surface-elevated)]" />
      <div className="mt-8 h-40 animate-pulse rounded-2xl bg-[var(--color-surface-elevated)]" />
    </main>
  );
}

async function ReceiptAccessContent({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const { receiptId } = await params;
  // Whop payment IDs are of the shape `pay_XXXXXXX`. Reject obvious garbage
  // up front so we don't even hit the DB on bot traffic.
  if (!/^[A-Za-z0-9_]{6,64}$/.test(receiptId)) notFound();

  const purchase = await prisma.purchase.findFirst({
    where: { whopPaymentId: receiptId },
    include: {
      template: {
        include: {
          sellerProfile: { select: { username: true } },
          files: { orderBy: { displayOrder: "asc" } },
        },
      },
    },
  });

  if (!purchase) {
    // Either the webhook hasn't fired yet (most likely) or this receipt
    // never existed. ProcessingAccess polls; if it's still gone after
    // ~30s it shows a "check your email / contact support" fallback.
    return <ProcessingAccess />;
  }

  const template = purchase.template;
  const tool = toolByValue(template.tool);
  const downloadFiles = template.files.filter((f) => f.kind === "DOWNLOAD");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href={`/templates/${template.slug}`}
        prefetch={false}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to template
      </Link>

      <div className="mt-6 flex items-start gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-success)]/15 text-[var(--color-success)]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Purchase confirmed
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
              Open the link below to duplicate the template into your own
              workspace.
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
                <li key={f.id} className="flex items-center gap-3 py-3">
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

      <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-5 text-sm text-[var(--color-text-secondary)]">
        <p className="font-medium text-[var(--color-text-primary)]">
          Bookmark this page or save the receipt email.
        </p>
        <p className="mt-1">
          The link above is your permanent download URL. To keep a library of
          all your purchases in one place,{" "}
          <Link
            href="/api/auth/login"
            className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            sign in with Whop
          </Link>{" "}
          — purchases tied to your email are claimed automatically.
        </p>
      </div>

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
