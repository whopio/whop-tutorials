"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useApp } from "./app-shell";
import { Markdown } from "./markdown";

interface ExistingMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function RefinementChat({
  generationId,
  existingMessages,
}: {
  generationId: string;
  existingMessages: ExistingMessage[];
}) {
  const [input, setInput] = useState("");
  const { isAtLimit, openLimitModal } = useApp();

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { generationId },
    }),
    messages: existingMessages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    })),
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        Refine
      </h3>

      {messages.length > 0 && (
        <div className="space-y-2 mb-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-accent-subtle text-text-primary ml-8"
                  : "bg-surface text-text-secondary mr-8"
              }`}
            >
              <span className="mb-0.5 block text-xs font-medium text-text-muted">
                {m.role === "user" ? "You" : "AI"}
              </span>
              {m.role === "user" ? (
                <div className="whitespace-pre-wrap">{getMessageText(m)}</div>
              ) : (
                <Markdown content={getMessageText(m)} />
              )}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isLoading) return;
          if (isAtLimit) { openLimitModal(); return; }
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Make it shorter, more formal..."
          className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || isAtLimit}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
