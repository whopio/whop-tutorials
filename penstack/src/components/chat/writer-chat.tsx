"use client";

import { useEffect, useState, type CSSProperties, type FC, type ReactNode } from "react";
import { Elements } from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

// ChatElement and ChatSession may not be exported in the current package version.
// Dynamically access them to avoid build-time failures.
let ChatElement: FC<{ options: { channelId: string }; style?: CSSProperties }> | undefined;
let ChatSession: FC<{ token: () => Promise<string>; children: ReactNode }> | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@whop/embedded-components-react-js");
  ChatElement = mod.ChatElement;
  ChatSession = mod.ChatSession;
} catch {
  // Not available yet
}

interface WriterChatProps {
  channelId: string;
  className?: string;
}

async function getToken(): Promise<string> {
  const res = await fetch("/api/token");
  const data = await res.json();
  return data.accessToken;
}

export function WriterChat({ channelId, className }: WriterChatProps) {
  const [elements, setElements] =
    useState<Awaited<ReturnType<typeof loadWhopElements>>>(null);

  useEffect(() => {
    loadWhopElements().then(setElements);
  }, []);

  if (!elements || !ChatElement || !ChatSession) {
    return (
      <div className={className}>
        <div className="flex h-[500px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
          <p>Chat is loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements elements={elements}>
      <ChatSession token={getToken}>
        <div className={className}>
          <ChatElement
            options={{ channelId }}
            style={{
              height: "500px",
              width: "100%",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          />
        </div>
      </ChatSession>
    </Elements>
  );
}
