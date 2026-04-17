"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-4 mb-2 text-lg font-semibold text-text-primary">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-4 mb-2 text-base font-semibold text-text-primary">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-3 mb-1.5 text-sm font-semibold text-text-primary">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="my-2 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-text-primary">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:text-accent-hover underline"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-surface-hover px-1 py-0.5 text-xs font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-md bg-surface-hover p-3 text-xs font-mono">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-border pl-3 italic text-text-tertiary">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-border-subtle" />,
        table: ({ children }) => (
          <table className="my-2 w-full border-collapse text-xs">{children}</table>
        ),
        th: ({ children }) => (
          <th className="border border-border px-2 py-1 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
