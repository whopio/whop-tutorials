import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTemplateBySlug } from "@/lib/templates";
import { appUrl } from "@/lib/whop";
import { CheckoutEmbed } from "@/components/CheckoutEmbed";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = await getTemplateBySlug(slug);
  if (!template || template.status !== "PUBLISHED") notFound();

  // Free templates don't go through Whop. Bounce back so the buyer hits the
  // free purchase path on the detail page.
  if (template.price === 0 || !template.whopPlanId) {
    redirect(`/templates/${slug}`);
  }

  // Must be signed in to buy. After OAuth, drop the buyer back here so they
  // don't have to find the template again.
  const me = await isAuthenticated();
  if (!me) {
    const next = encodeURIComponent(`/templates/${slug}/checkout`);
    redirect(`/api/auth/login?redirect_to=${next}`);
  }

  // Sellers shouldn't be able to buy their own work — the publish + access
  // logic already covers this, but redirecting here keeps the UI consistent.
  if (me.id === template.sellerProfile.userId) {
    redirect(`/templates/${slug}`);
  }

  // Already a buyer — jump straight to access.
  const purchase = await prisma.purchase.findUnique({
    where: { userId_templateId: { userId: me.id, templateId: template.id } },
  });
  if (purchase) {
    redirect(`/templates/${slug}/access`);
  }

  const isSandbox = process.env.WHOP_SANDBOX?.trim() === "true";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href={`/templates/${slug}`}
        prefetch={false}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to template
      </Link>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
          Checkout
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
          {template.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          by{" "}
          <Link
            href={`/sellers/${template.sellerProfile.username}`}
            className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
          >
            @{template.sellerProfile.username}
          </Link>{" "}
          · <span className="font-medium text-[var(--color-text-primary)]">{formatPrice(template.price)}</span>
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <CheckoutEmbed
          planId={template.whopPlanId}
          slug={template.slug}
          isSandbox={isSandbox}
          appUrl={appUrl}
        />
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        Payment processed securely by Whop. Card details never touch Stax.
      </p>
    </main>
  );
}
