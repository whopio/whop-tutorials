"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";

export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(() => params?.get("q") ?? "");

  useEffect(() => {
    const fromUrl = params?.get("q") ?? "";
    if (pathname?.startsWith("/templates")) {
      setValue(fromUrl);
    }
  }, [params, pathname]);

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
      className="flex flex-1 md:max-w-md lg:max-w-lg"
    >
      <div className="relative w-full">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-secondary)]">
          <Search className="h-4 w-4" aria-hidden />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search templates"
          aria-label="Search templates"
          className="block w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-subtle)]"
        />
      </div>
    </form>
  );
}
