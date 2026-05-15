"use client";

import { Loader2, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ExistingReview {
  stars: number;
  title: string | null;
  body: string | null;
}

export function ReviewForm({
  templateId,
  templateSlug,
  existing,
}: {
  templateId: string;
  templateSlug: string;
  existing: ExistingReview | null;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (stars < 1) {
      setError("Pick a star rating before submitting.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars,
          title: title.trim() || null,
          body: body.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : null) ?? `Submit failed (${res.status})`,
        );
        setPending(false);
        return;
      }
      router.push(`/templates/${templateSlug}`);
      router.refresh();
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  async function deleteReview() {
    if (!existing) return;
    if (!confirm("Delete this review?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}/reviews`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(`Delete failed (${res.status})`);
        setPending(false);
        return;
      }
      router.push(`/templates/${templateSlug}`);
      router.refresh();
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  const renderedStars = hoverStars ?? stars;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">
          Your rating
        </p>
        <div
          className="inline-flex gap-1"
          onMouseLeave={() => setHoverStars(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHoverStars(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className="rounded p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Star
                className={`h-7 w-7 transition ${
                  n <= renderedStars
                    ? "fill-[var(--color-rating)] text-[var(--color-rating)]"
                    : "text-[var(--color-border)]"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
          Title <span className="text-xs font-normal text-[var(--color-text-secondary)]">(optional)</span>
        </span>
        <input
          type="text"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
          What did you think? <span className="text-xs font-normal text-[var(--color-text-secondary)]">(optional)</span>
        </span>
        <textarea
          value={body}
          rows={5}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A few sentences on what worked and what could be better."
          className="block w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-subtle)]"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {existing && (
            <button
              type="button"
              onClick={deleteReview}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete review
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {existing ? "Updating…" : "Submitting…"}
            </>
          ) : (
            <>{existing ? "Update review" : "Submit review"}</>
          )}
        </button>
      </div>
    </div>
  );
}
