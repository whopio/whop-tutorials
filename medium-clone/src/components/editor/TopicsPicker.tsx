"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

export interface TopicOption {
  slug: string;
  name: string;
}

interface Props {
  options: TopicOption[];
  selected: string[];
  onChange: (slugs: string[]) => void;
  max?: number;
}

export function TopicsPicker({ options, selected, onChange, max = 5 }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return options
      .filter((o) => !selected.includes(o.slug))
      .filter((o) => (q ? o.name.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [options, selected, query]);

  function add(slug: string) {
    if (selected.includes(slug) || selected.length >= max) return;
    onChange([...selected, slug]);
    setQuery("");
  }

  function remove(slug: string) {
    onChange(selected.filter((s) => s !== slug));
  }

  const selectedOptions = selected
    .map((s) => options.find((o) => o.slug === s))
    .filter((o): o is TopicOption => Boolean(o));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {selectedOptions.map((opt) => (
          <span
            key={opt.slug}
            className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-pill bg-text-primary text-white text-sm"
          >
            {opt.name}
            <button
              type="button"
              aria-label={`Remove ${opt.name}`}
              onClick={() => remove(opt.slug)}
              className="size-5 rounded-full flex items-center justify-center hover:bg-white/10"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ))}
      </div>

      {selected.length < max && (
        <div className="mt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selected.length === 0 ? `Add up to ${max} topics` : "Add another topic…"}
            className="w-full px-4 py-3 rounded-md border border-border bg-background text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
            aria-label="Search topics"
          />
          {(query || filtered.length > 0) && (
            <ul role="listbox" className="mt-2 flex flex-wrap gap-2">
              {filtered.length === 0 && query && (
                <li className="text-sm text-text-tertiary">No matching topic.</li>
              )}
              {filtered.map((opt) => (
                <li key={opt.slug}>
                  <button
                    type="button"
                    onClick={() => add(opt.slug)}
                    className="px-3 py-1.5 rounded-pill border border-border text-sm text-text-secondary hover:border-text-primary hover:text-text-primary"
                  >
                    {opt.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
