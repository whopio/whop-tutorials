/**
 * Compact helpers for authoring TipTap JSON document bodies in seed data.
 *
 * Lets us write stories as:
 *   doc(
 *     p("First paragraph."),
 *     h2("A section"),
 *     p("Another paragraph."),
 *     paywallBreak(),
 *     p("Members-only continuation."),
 *   )
 *
 * paywallNodePos is computed from the body — find the index of the paywallBreak
 * node in `content[]`. Returns null if there isn't one.
 */

type TextNode = { type: "text"; text: string; marks?: Array<{ type: string }> };
type ParagraphNode = { type: "paragraph"; content?: TextNode[] };
type HeadingNode = { type: "heading"; attrs: { level: 2 | 3 }; content: TextNode[] };
type BulletListNode = { type: "bulletList"; content: ListItemNode[] };
type ListItemNode = { type: "listItem"; content: ParagraphNode[] };
type BlockquoteNode = { type: "blockquote"; content: ParagraphNode[] };
type PaywallBreakNode = { type: "paywallBreak" };

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | BlockquoteNode
  | PaywallBreakNode;

export interface TipTapDoc {
  type: "doc";
  content: BlockNode[];
}

export function doc(...nodes: BlockNode[]): TipTapDoc {
  return { type: "doc", content: nodes };
}

export function p(text: string): ParagraphNode {
  return { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
}

export function h2(text: string): HeadingNode {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

export function h3(text: string): HeadingNode {
  return { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] };
}

export function ul(...items: string[]): BulletListNode {
  return {
    type: "bulletList",
    content: items.map((t) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
    })),
  };
}

export function quote(text: string): BlockquoteNode {
  return {
    type: "blockquote",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export function paywallBreak(): PaywallBreakNode {
  return { type: "paywallBreak" };
}

/* ─────────────────────── Derived metadata helpers ─────────────────────── */

/** Position of the `paywallBreak` node in the doc's content array, or null. */
export function paywallPos(d: TipTapDoc): number | null {
  const i = d.content.findIndex((n) => n.type === "paywallBreak");
  return i === -1 ? null : i;
}

/** Plain-text extraction for excerpt + reading-time calculations. */
export function plainText(d: TipTapDoc): string {
  const parts: string[] = [];
  for (const n of d.content) {
    if (n.type === "paragraph" && n.content) {
      parts.push(n.content.map((t) => t.text).join(""));
    } else if (n.type === "heading") {
      parts.push(n.content.map((t) => t.text).join(""));
    } else if (n.type === "bulletList") {
      for (const li of n.content) {
        for (const para of li.content) {
          parts.push((para.content ?? []).map((t) => t.text).join(""));
        }
      }
    } else if (n.type === "blockquote") {
      for (const para of n.content) {
        parts.push((para.content ?? []).map((t) => t.text).join(""));
      }
    }
  }
  return parts.join(" ");
}

export function excerpt(d: TipTapDoc, maxChars = 160): string {
  const text = plainText(d).trim();
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Reading time in whole minutes, floor 1. ~220 wpm. */
export function readingMinutes(d: TipTapDoc): number {
  const words = plainText(d).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
