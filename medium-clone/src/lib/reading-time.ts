import type { JSONContent } from "@tiptap/core";

const WORDS_PER_MINUTE = 265;

function countWords(node: JSONContent): number {
  let total = 0;
  if (typeof node.text === "string") {
    total += node.text.trim().split(/\s+/).filter(Boolean).length;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) total += countWords(child);
  }
  return total;
}

export function computeReadingTime(doc: JSONContent | null | undefined): number {
  if (!doc) return 1;
  const words = countWords(doc);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
