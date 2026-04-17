"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./app-shell";

interface TemplateItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tier: "FREE" | "PRO";
  inputFields: { name: string; label: string; placeholder: string; type: "text" | "textarea" }[];
}

export function TemplateSidebar({
  templates,
  userTier,
}: {
  templates: TemplateItem[];
  userTier: "FREE" | "PRO";
}) {
  const { selectedTemplateSlug, selectTemplate, openUpgradeModal } = useApp();
  const selectedTemplate = templates.find((t) => t.slug === selectedTemplateSlug);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Templates
        </h2>
      </div>

      {selectedTemplate ? (
        <TemplateForm
          template={selectedTemplate}
          userTier={userTier}
          onBack={() => selectTemplate(null)}
          onUpgradeRequired={openUpgradeModal}
        />
      ) : (
        <TemplateList
          templates={templates}
          userTier={userTier}
          onSelect={(slug) => selectTemplate(slug)}
        />
      )}
    </div>
  );
}

function TemplateList({
  templates,
  userTier,
  onSelect,
}: {
  templates: TemplateItem[];
  userTier: "FREE" | "PRO";
  onSelect: (slug: string) => void;
}) {
  const freeTemplates = templates.filter((t) => t.tier === "FREE");
  const proTemplates = templates.filter((t) => t.tier === "PRO");

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-4">
      <p className="mb-2 px-1 text-xs font-medium text-text-muted uppercase tracking-wider">Free</p>
      <div className="space-y-1">
        {freeTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.slug)}
            className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <p className="text-sm font-medium text-text-primary">{t.name}</p>
            <p className="mt-0.5 text-xs text-text-muted truncate">{t.description}</p>
          </button>
        ))}
      </div>

      <p className="mb-2 mt-4 px-1 text-xs font-medium text-text-muted uppercase tracking-wider">Pro</p>
      <div className="space-y-1">
        {proTemplates.map((t) => {
          const locked = userTier === "FREE";
          return (
            <button
              key={t.id}
              onClick={() => !locked && onSelect(t.slug)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                locked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-surface-hover cursor-pointer"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${locked ? "text-text-tertiary" : "text-text-primary"}`}>
                  {t.name}
                </p>
                {locked && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                )}
              </div>
              <p className="mt-0.5 text-xs text-text-muted truncate">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TemplateForm({
  template,
  userTier,
  onBack,
  onUpgradeRequired,
}: {
  template: TemplateItem;
  userTier: "FREE" | "PRO";
  onBack: () => void;
  onUpgradeRequired: () => void;
}) {
  const router = useRouter();
  const { selectGeneration, isAtLimit, openLimitModal, setGenerationsRemaining } = useApp();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (template.tier === "PRO" && userTier === "FREE") {
      onUpgradeRequired();
      return;
    }

    if (isAtLimit) {
      openLimitModal();
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: template.slug, inputs: values }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        openLimitModal();
      }
      setError(data.error || "Generation failed.");
      setLoading(false);
      return;
    }

    const { generationId, remaining } = await res.json();
    selectGeneration(generationId);
    if (typeof remaining === "number") setGenerationsRemaining(remaining);
    router.refresh();
    setLoading(false);
    setValues({});
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <button
        onClick={onBack}
        className="flex items-center gap-1 px-4 py-2 text-xs text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        All templates
      </button>

      <div className="px-4 pb-2">
        <span className="text-xs font-medium text-accent">{template.category}</span>
        <h3 className="text-sm font-semibold text-text-primary">{template.name}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{template.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-4 pb-4">
        <div className="flex-1 space-y-3">
          {template.inputFields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-xs font-medium text-text-secondary mb-1">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={values[field.name] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
                  required
                />
              ) : (
                <input
                  id={field.name}
                  type="text"
                  placeholder={field.placeholder}
                  value={values[field.name] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
                  required
                />
              )}
            </div>
          ))}
        </div>

        {error && <p className="mt-2 text-xs text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading || isAtLimit}
          className="mt-3 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>
    </div>
  );
}
