"use client";

import { useState, useEffect } from "react";
import { ChatElement, ChatSession, Elements } from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import { MessageCircle, Loader2 } from "lucide-react";

const elementsPromise = loadWhopElements({
  appearance: {
    theme: {
      appearance: "dark",
      accentColor: "teal",
      grayColor: "gray",
    },
  },
});

export function CourseChatLive({ channelId }: { channelId: string }) {
  const getToken = async (): Promise<string> => {
    const res = await fetch("/api/token");
    if (!res.ok) throw new Error("Token fetch failed");
    const data = await res.json();
    return data.token;
  };
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ready) setTimedOut(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [ready]);

  if (timedOut && !ready) {
    return (
      <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
          <span className="text-sm font-medium">Course Discussion</span>
        </div>
        <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">
          Chat is temporarily unavailable. Try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
        <span className="text-sm font-medium">Course Discussion</span>
      </div>
      <div className="relative" style={{ height: "400px" }}>
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[var(--color-surface)]">
            <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading chat...</p>
          </div>
        )}
        <Elements elements={elementsPromise}>
          <ChatSession token={getToken}>
            <ChatElement
              options={{
                channelId,
                onReady: () => setReady(true),
              }}
              style={{ height: "400px", width: "100%" }}
            />
          </ChatSession>
        </Elements>
      </div>
    </div>
  );
}
