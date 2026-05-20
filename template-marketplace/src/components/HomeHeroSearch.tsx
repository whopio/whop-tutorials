"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function HomeHeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    router.push(`/templates${search.toString() ? `?${search.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg shadow-[var(--color-accent-subtle)]"
    >
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--color-text-secondary)]">
          <Search className="h-4 w-4" aria-hidden />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search Notion docs, Figma kits, Webflow clones..."
          aria-label="Search templates"
          className="block w-full rounded-full bg-transparent py-3 pl-11 pr-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
      >
        Search
      </button>
    </form>
  );
}
