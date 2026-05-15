"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TOOLS, CATEGORIES } from "@/constants/categories";
import type {
  Tool,
  Category,
  DeliveryType,
} from "@/generated/prisma/client";

export interface TemplateFormState {
  title: string;
  description: string;
  priceDollars: string; // string so user can type freely; converted on save
  tool: Tool;
  category: Category;
  deliveryType: DeliveryType;
  shareUrl: string;
  content: string;
}

export function TemplateForm({
  templateId,
  initial,
}: {
  templateId: string;
  initial: TemplateFormState;
}) {
  const [form, setForm] = useState<TemplateFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = <K extends keyof TemplateFormState>(
    key: K,
    value: TemplateFormState[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        const priceCents = Math.max(
          0,
          Math.round(Number.parseFloat(form.priceDollars || "0") * 100),
        );
        const body = {
          title: form.title,
          description: form.description,
          price: Number.isNaN(priceCents) ? 0 : priceCents,
          tool: form.tool,
          category: form.category,
          deliveryType: form.deliveryType,
          shareUrl: form.shareUrl.trim() || null,
          content: form.content.trim() || null,
        };
        const res = await fetch(`/api/sell/templates/${templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          setError(
            (errBody && typeof errBody === "object" && "error" in errBody && typeof errBody.error === "string"
              ? errBody.error
              : `Save failed (${res.status})`) ?? `Save failed (${res.status})`,
          );
        } else {
          setSavedAt(new Date());
        }
      } catch {
        setError("Network error while saving");
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, templateId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Template details
        </h2>
        <SaveStatus saving={saving} savedAt={savedAt} error={error} />
      </div>

      <Field label="Title">
        <input
          type="text"
          value={form.title}
          maxLength={80}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. SaaS pricing model with cohort retention"
          className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
        />
      </Field>

      <Field
        label="Description"
        helper="Markdown supported. Buyers see this on the product detail page."
      >
        <textarea
          value={form.description}
          maxLength={2000}
          rows={5}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What buyers will get, who it's for, how it works. A few crisp sentences beats a wall of text."
          className="block w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
        />
      </Field>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Price (USD)" helper="Set to 0 for free templates.">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.priceDollars}
              onChange={(e) => update("priceDollars", e.target.value)}
              className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-7 pr-3 text-sm text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
            />
          </div>
        </Field>

        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value as Category)}
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Tool" helper="Drives the badge on the product card and powers tool filters.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {TOOLS.map((t) => {
            const selected = form.tool === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => update("tool", t.value)}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${
                  selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]"
                }`}
              >
                <div
                  className="text-sm font-semibold"
                  style={{ color: `var(${t.cssVar})` }}
                >
                  {t.label}
                </div>
                <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  {t.description}
                </div>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Delivery type" helper="How buyers receive the template after purchase.">
        <div className="grid gap-3 sm:grid-cols-2">
          <DeliveryRadio
            label="File download"
            description="Buyers download the files you upload (.docx, .xlsx, .zip, etc.)"
            checked={form.deliveryType === "FILE_DOWNLOAD"}
            onChange={() => update("deliveryType", "FILE_DOWNLOAD")}
          />
          <DeliveryRadio
            label="Share URL"
            description="Reveal a Notion / Webflow / GitHub URL after purchase"
            checked={form.deliveryType === "SHARE_URL"}
            onChange={() => update("deliveryType", "SHARE_URL")}
          />
        </div>
      </Field>

      {form.deliveryType === "SHARE_URL" && (
        <Field label="Share URL" helper="Revealed to buyers post-purchase.">
          <input
            type="url"
            value={form.shareUrl}
            onChange={(e) => update("shareUrl", e.target.value)}
            placeholder="https://www.notion.so/..."
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
          />
        </Field>
      )}

      <Field label="Setup notes (optional)" helper="Markdown shown to buyers on the access page.">
        <textarea
          value={form.content}
          rows={4}
          maxLength={10000}
          onChange={(e) => update("content", e.target.value)}
          placeholder="Step-by-step setup instructions, requirements, etc."
          className="block w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </span>
        {helper && (
          <span className="text-xs text-[var(--color-text-secondary)]">{helper}</span>
        )}
      </div>
      {children}
    </label>
  );
}

function DeliveryRadio({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left transition ${
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]"
      }`}
    >
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
        {label}
      </span>
      <span className="mt-1 text-xs text-[var(--color-text-secondary)]">
        {description}
      </span>
    </button>
  );
}

function SaveStatus({
  saving,
  savedAt,
  error,
}: {
  saving: boolean;
  savedAt: Date | null;
  error: string | null;
}) {
  if (error) {
    return <span className="text-xs text-[var(--color-error)]">{error}</span>;
  }
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="text-xs text-[var(--color-text-secondary)]">
        Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  return null;
}
