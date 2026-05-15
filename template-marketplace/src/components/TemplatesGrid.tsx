import { TemplateCard } from "./TemplateCard";
import type { TemplateCardSummary } from "@/lib/templates";

export function TemplatesGrid({
  templates,
  emptyTitle = "No templates yet",
  emptyDescription = "Be the first seller in this category.",
}: {
  templates: TemplateCardSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
        <h3 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
          {emptyTitle}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} />
      ))}
    </div>
  );
}
