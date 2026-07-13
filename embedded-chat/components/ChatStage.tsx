"use client";

import { useCallback, useMemo } from "react";
import {
  ChatElement,
  ChatSession,
  Elements,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import type {
  Appearance,
  ChatElementEvent,
  ChatElementOptions,
} from "@whop/embedded-components-vanilla-js/types";

const elements = loadWhopElements({ environment: "sandbox" });

export function ChatStage({
  userId,
  channelId,
  chatStyle = "imessage",
  appearance,
  onEvent,
}: {
  userId: string;
  channelId: string;
  chatStyle?: "imessage" | "discord";
  appearance?: Appearance;
  onEvent?: (event: ChatElementEvent) => void;
}) {
  const getToken = useCallback(async () => {
    const res = await fetch("/api/chat/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(`token request failed: ${res.status}`);
    const data = await res.json();
    return data.token as string;
  }, [userId]);

  const options: ChatElementOptions = useMemo(
    () => ({ channelId, style: chatStyle, onEvent }),
    [channelId, chatStyle, onEvent],
  );

  return (
    <Elements elements={elements} appearance={appearance}>
      <ChatSession key={userId} token={getToken}>
        <ChatElement options={options} style={{ height: "100%", width: "100%" }} />
      </ChatSession>
    </Elements>
  );
}
