import { PaywallGate } from "./paywall-gate";

interface PostContentProps {
  content: unknown;
  paywallIndex?: number | null;
  hasAccess?: boolean;
  writerName?: string;
  writerHandle?: string;
  price?: number;
}

export function PostContent({
  content,
  paywallIndex,
  hasAccess,
  writerName = "",
  writerHandle = "",
  price = 0,
}: PostContentProps) {
  const doc = content as { type: string; content?: unknown[] };
  const nodes = doc?.content ?? [];

  // Determine which nodes to render
  let visibleNodes = nodes;
  let showPaywall = false;

  if (paywallIndex != null && !hasAccess) {
    visibleNodes = nodes.slice(0, paywallIndex);
    showPaywall = true;
  }

  return (
    <div>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{
          __html: renderNodes(visibleNodes),
        }}
      />
      {showPaywall && (
        <PaywallGate
          writerName={writerName}
          writerHandle={writerHandle}
          price={price}
        />
      )}
    </div>
  );
}

// Minimal Tiptap JSON -> HTML renderer
function renderNodes(nodes: unknown[]): string {
  return nodes.map(renderNode).join("");
}

function renderNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;

  switch (n.type) {
    case "paragraph":
      return `<p>${renderChildren(n)}</p>`;
    case "heading": {
      const level = (n.attrs as Record<string, unknown>)?.level ?? 2;
      return `<h${level}>${renderChildren(n)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderChildren(n)}</ul>`;
    case "orderedList":
      return `<ol>${renderChildren(n)}</ol>`;
    case "listItem":
      return `<li>${renderChildren(n)}</li>`;
    case "blockquote":
      return `<blockquote>${renderChildren(n)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${renderChildren(n)}</code></pre>`;
    case "image": {
      const attrs = n.attrs as Record<string, unknown>;
      const src = attrs?.src ?? "";
      const alt = attrs?.alt ?? "";
      return `<img src="${escapeHtml(String(src))}" alt="${escapeHtml(String(alt))}" />`;
    }
    case "horizontalRule":
      return `<hr />`;
    case "hardBreak":
      return `<br />`;
    case "paywallBreak":
      return "";
    case "text": {
      let text = escapeHtml(String(n.text ?? ""));
      const marks = n.marks as Array<Record<string, unknown>> | undefined;
      if (marks) {
        for (const mark of marks) {
          switch (mark.type) {
            case "bold":
              text = `<strong>${text}</strong>`;
              break;
            case "italic":
              text = `<em>${text}</em>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "strike":
              text = `<s>${text}</s>`;
              break;
            case "code":
              text = `<code>${text}</code>`;
              break;
            case "link": {
              const href = (mark.attrs as Record<string, unknown>)?.href ?? "";
              text = `<a href="${escapeHtml(String(href))}" target="_blank" rel="noopener noreferrer">${text}</a>`;
              break;
            }
          }
        }
      }
      return text;
    }
    default:
      return renderChildren(n);
  }
}

function renderChildren(node: Record<string, unknown>): string {
  const children = node.content as unknown[] | undefined;
  if (!children) return "";
  return renderNodes(children);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
