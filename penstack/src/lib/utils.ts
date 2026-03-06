/**
 * Generate a URL-safe slug from a title.
 * Handles unicode, strips special chars, limits length.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^\w\s-]/g, "") // remove non-word chars
    .replace(/[\s_]+/g, "-") // spaces/underscores to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 80); // limit length
}

/**
 * Format a date for display (e.g., "Feb 23, 2026")
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

/**
 * Format a number for display (e.g., 1234 -> "1.2K")
 */
export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/**
 * Format cents to dollar string (e.g., 999 -> "$9.99")
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Estimate reading time from Tiptap JSON content.
 * Counts words in text nodes, assumes 200 wpm.
 */
export function estimateReadingTime(content: unknown): number {
  let wordCount = 0;

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "text" && typeof n.text === "string") {
      wordCount += n.text.split(/\s+/).filter(Boolean).length;
    }
    if (Array.isArray(n.content)) {
      n.content.forEach(walk);
    }
  }

  walk(content);
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + "\u2026";
}

/**
 * Extract plain text from Tiptap JSON for previews/SEO.
 */
export function extractPlainText(content: unknown, maxLength = 200): string {
  const parts: string[] = [];

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "text" && typeof n.text === "string") {
      parts.push(n.text);
    }
    if (Array.isArray(n.content)) {
      n.content.forEach(walk);
    }
  }

  walk(content);
  return truncate(parts.join(" "), maxLength);
}
