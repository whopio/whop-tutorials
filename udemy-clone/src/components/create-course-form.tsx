"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "DEVELOPMENT", "BUSINESS", "DESIGN", "MARKETING",
  "PHOTOGRAPHY", "MUSIC", "HEALTH", "LIFESTYLE",
];

export function CreateCourseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      price: Math.round(Number(form.get("price")) * 100),
      category: form.get("category") as string,
      thumbnailUrl: (form.get("thumbnailUrl") as string) || "",
    };

    try {
      const res = await fetch("/api/teach/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.error === "string") {
          setError(data.error);
        } else if (data.error?.fieldErrors) {
          const fields = data.error.fieldErrors;
          const messages = Object.entries(fields)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
            .join(". ");
          setError(messages || "Validation failed");
        } else {
          setError("Validation failed");
        }
        return;
      }
      router.push(`/teach/courses/${data.course.id}/edit`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Title</label>
        <input
          name="title"
          required
          maxLength={100}
          className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
          placeholder="e.g. Introduction to Python"
        />
      </div>
      <div>
        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Description</label>
        <textarea
          name="description"
          required
          rows={4}
          maxLength={5000}
          className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
          placeholder="What will students learn?"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Price (USD)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Category</label>
          <select
            name="category"
            required
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">Select...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Thumbnail URL (optional)</label>
        <input
          name="thumbnailUrl"
          type="url"
          className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
          placeholder="https://..."
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Course"}
      </button>
    </form>
  );
}
