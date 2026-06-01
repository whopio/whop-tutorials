import Link from "next/link";
import { Search } from "lucide-react";

/**
 * Mobile-only search trigger. Lives in the header next to the notification
 * bell on small screens (the inline <SearchBar> is hidden under md:). Tapping
 * navigates to /search where the input auto-focuses.
 */
export function SearchButton() {
  return (
    <Link
      href="/search"
      aria-label="Search Storyline"
      className="md:hidden inline-flex items-center justify-center size-9 rounded-full text-text-secondary hover:bg-surface hover:text-text-primary"
    >
      <Search aria-hidden="true" className="size-[18px]" />
    </Link>
  );
}
