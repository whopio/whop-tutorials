import "server-only";
import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";

interface RenderOptions {
  /**
   * Truncate the document at the first paywallBreak node — used in Part 3 to
   * gate Plus stories for non-Plus readers. Free stories render the whole doc.
   */
  truncateAtPaywall?: boolean;
}

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "ftp:"]);

function sanitizeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return undefined;
    return href;
  } catch {
    return undefined;
  }
}

function renderMarks(text: string, marks: JSONContent["marks"] | undefined, key: string): ReactNode {
  if (!marks || marks.length === 0) return text;
  let node: ReactNode = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        node = <strong key={`${key}-b`}>{node}</strong>;
        break;
      case "italic":
        node = <em key={`${key}-i`}>{node}</em>;
        break;
      case "strike":
        node = <s key={`${key}-s`}>{node}</s>;
        break;
      case "underline":
        node = <u key={`${key}-u`}>{node}</u>;
        break;
      case "code":
        node = <code key={`${key}-c`} className="story-inline-code">{node}</code>;
        break;
      case "link": {
        const href = sanitizeHref((mark.attrs as { href?: string } | undefined)?.href);
        if (href) {
          node = (
            <a
              key={`${key}-a`}
              href={href}
              rel="noopener noreferrer nofollow"
              className="story-link"
              target="_blank"
            >
              {node}
            </a>
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return node;
}

function renderChildren(children: JSONContent[] | undefined, prefix: string): ReactNode[] {
  if (!children) return [];
  return children.map((child, i) => renderNode(child, `${prefix}-${i}`));
}

function renderNode(node: JSONContent, key: string): ReactNode {
  switch (node.type) {
    case "doc":
      return <>{renderChildren(node.content, key)}</>;
    case "paragraph":
      return <p key={key}>{renderChildren(node.content, key)}</p>;
    case "heading": {
      const level = (node.attrs as { level?: 1 | 2 | 3 } | undefined)?.level ?? 2;
      if (level === 1) return <h1 key={key}>{renderChildren(node.content, key)}</h1>;
      if (level === 3) return <h3 key={key}>{renderChildren(node.content, key)}</h3>;
      return <h2 key={key}>{renderChildren(node.content, key)}</h2>;
    }
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node.content, key)}</blockquote>;
    case "bulletList":
      return <ul key={key}>{renderChildren(node.content, key)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderChildren(node.content, key)}</ol>;
    case "listItem":
      return <li key={key}>{renderChildren(node.content, key)}</li>;
    case "codeBlock":
      return (
        <pre key={key} className="story-code">
          <code>{renderChildren(node.content, key)}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} className="story-divider" />;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const attrs = (node.attrs ?? {}) as { src?: string; alt?: string; title?: string };
      const src = sanitizeHref(attrs.src);
      if (!src) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={src}
          alt={attrs.alt ?? ""}
          title={attrs.title}
          className="story-image"
        />
      );
    }
    case "paywallBreak":
      return (
        <div key={key} data-paywall-break="true" className="paywall-break" aria-hidden="true">
          <div className="paywall-break-inner">Paid content starts here</div>
        </div>
      );
    case "text":
      return renderMarks(node.text ?? "", node.marks, key);
    default:
      return <>{renderChildren(node.content, key)}</>;
  }
}

export function StoryContent({ json, options = {} }: { json: unknown; options?: RenderOptions }) {
  let doc = (json ?? { type: "doc", content: [] }) as JSONContent & { content?: JSONContent[] };
  if (options.truncateAtPaywall && Array.isArray(doc.content)) {
    const idx = doc.content.findIndex((n) => (n as { type?: string }).type === "paywallBreak");
    if (idx > -1) doc = { ...doc, content: doc.content.slice(0, idx) };
  }
  return <>{renderNode(doc, "n")}</>;
}
