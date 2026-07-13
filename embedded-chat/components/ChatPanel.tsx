"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat";

export function ChatPanel({
  channelId,
  userId,
  userName,
}: {
  channelId: string;
  userId: string;
  userName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "no_access">("loading");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/chat/messages?channelId=${encodeURIComponent(channelId)}&userId=${userId}`,
    );
    if (res.status === 403) {
      setStatus("no_access");
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setStatus("ok");
    setMessages(data.messages ?? []);
  }, [channelId, userId]);

  useEffect(() => {
    setStatus("loading");
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, userId, content }),
    });
    setSending(false);
    if (res.ok) {
      setInput("");
      load();
    }
  }, [input, sending, channelId, userId, load]);

  if (status === "no_access") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        This user does not have access to this conversation.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.user.id === userId;
          return (
            <div key={m.id} className={mine ? "text-right" : "text-left"}>
              <div className="text-xs text-gray-500">
                {m.user.name ?? m.user.username}
              </div>
              <div
                className={[
                  "mt-0.5 inline-block rounded-2xl px-3 py-2 text-sm",
                  mine ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-900",
                ].join(" ")}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-gray-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={`Message as ${userName}...`}
          className="min-h-[40px] flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !input.trim()}
          className="h-10 rounded-lg bg-orange-600 px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
