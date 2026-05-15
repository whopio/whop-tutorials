import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireSeller } from "@/lib/auth";
import { generateSlug } from "@/lib/slug";
import { prisma } from "@/lib/prisma";

async function createDraft(formData: FormData) {
  "use server";

  const { seller } = await requireSeller();
  const title = (formData.get("title")?.toString() ?? "").trim().slice(0, 80);
  if (!title) {
    return;
  }
  const slug = await generateSlug(title);
  const template = await prisma.template.create({
    data: {
      sellerProfileId: seller.id,
      title,
      slug,
      description: "",
      price: 0,
      tool: "DOCX",
      category: "PRODUCTIVITY",
      deliveryType: "FILE_DOWNLOAD",
      status: "DRAFT",
    },
  });
  redirect(`/sell/templates/${template.id}/edit`);
}

export default async function NewTemplatePage() {
  await requireSeller();

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm text-[var(--color-text-secondary)]">New template</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
        Start with a title
      </h1>
      <p className="mt-3 text-base text-[var(--color-text-secondary)]">
        We&rsquo;ll create a draft you can fill in details for, upload files,
        and publish when ready.
      </p>

      <form action={createDraft} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="title"
          maxLength={80}
          required
          autoFocus
          placeholder="e.g. SaaS pricing model"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
