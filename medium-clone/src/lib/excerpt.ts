import type { JSONContent } from "@tiptap/core";

const MAX_LEN = 200;

function collectText(node: JSONContent, out: string[]): void {
  if (out.join(" ").length > MAX_LEN * 2) return;
  if (typeof node.text === "string") out.push(node.text);
  if (Array.isArray(node.content)) {
    for (const child of node.content) collectText(child, out);
  }
}

export function buildExcerpt(doc: JSONContent | null | undefined): string {
  if (!doc) return "";
  const parts: string[] = [];
  collectText(doc, parts);
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= MAX_LEN) return text;
  return text.slice(0, MAX_LEN).replace(/\s+\S*$/, "") + "…";
}
