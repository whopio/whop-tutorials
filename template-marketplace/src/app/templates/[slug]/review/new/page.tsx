import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewForm } from "@/components/ReviewForm";

export default function NewReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <NewReviewContent params={params} />
    </Suspense>
  );
}

function ReviewSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-surface-elevated)]" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded-lg bg-[var(--color-surface-elevated)]" />
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-[var(--color-surface-elevated)]" />
    </main>
  );
}

async function NewReviewContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAuth();

  const template = await prisma.template.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      sellerProfile: { select: { username: true, userId: true } },
    },
  });
  if (!template) notFound();

  // Sellers can't review their own template
  if (template.sellerProfile.userId === user.id) {
    redirect(`/templates/${template.slug}`);
  }

  // Must have purchased
  const purchase = await prisma.purchase.findUnique({
    where: { userId_templateId: { userId: user.id, templateId: template.id } },
    select: { id: true },
  });
  if (!purchase) {
    redirect(`/templates/${template.slug}`);
  }

  const existing = await prisma.review.findUnique({
    where: { userId_templateId: { userId: user.id, templateId: template.id } },
    select: { stars: true, title: true, body: true },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href={`/templates/${template.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to template
      </Link>

      <div className="mt-6">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {existing ? "Edit your review" : "Write a review"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {template.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          by{" "}
          <Link
            href={`/sellers/${template.sellerProfile.username}`}
            className="font-medium text-[var(--color-text-primary)] hover:underline"
          >
            @{template.sellerProfile.username}
          </Link>
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <ReviewForm
          templateId={template.id}
          templateSlug={template.slug}
          existing={existing ?? null}
        />
      </div>
    </main>
  );
}
