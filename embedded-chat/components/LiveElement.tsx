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

// Production elements runtime for the live embed surface. This is a separate
// module from ChatStage on purpose: ChatStage loads the runtime with
// environment:"sandbox" and lives only at /chat/embed, while this loads it with
// environment:"production". Keeping them in different modules means a single
// page never loads the runtime twice with conflicting environments.
const elements = loadWhopElements({ environment: "production" });

export function LiveElement({
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
  // Authenticate against the production token route. Bound to the selected demo
  // user; switching users remounts ChatSession (keyed on userId) for a fresh token.
  const getToken = useCallback(async () => {
    const res = await fetch("/api/chat/prod-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(`prod token request failed: ${res.status}`);
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
