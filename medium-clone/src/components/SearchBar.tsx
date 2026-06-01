import { Search } from "lucide-react";

/**
 * Desktop search input. Plain GET form pointed at /search — no JS, no
 * onChange handlers. The /search page reads `q` from the searchParams.
 *
 * `defaultValue` is the current query (when rendered on /search itself), so
 * the input stays populated after submission.
 */
export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form
      action="/search"
      method="GET"
      role="search"
      className="hidden md:flex items-center gap-2 px-3 h-9 rounded-pill bg-surface hover:bg-surface/80 focus-within:bg-surface focus-within:ring-1 focus-within:ring-text-primary/20 transition-colors w-[240px] lg:w-[280px]"
    >
      <Search
        aria-hidden="true"
        className="size-4 text-text-tertiary shrink-0"
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search"
        aria-label="Search Storyline"
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-tertiary"
      />
    </form>
  );
}
