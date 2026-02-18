"use client";

import { useMemo } from "react";
import {
  ChatElement,
  ChatSession,
  Elements,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import type { ChatElementOptions } from "@whop/embedded-components-vanilla-js/types";

const whopEnvironment =
  (process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT as "sandbox" | "production") ||
  "production";

const elements = loadWhopElements({ environment: whopEnvironment });

async function getToken({ abortSignal }: { abortSignal: AbortSignal }) {
  const response = await fetch("/api/token", { signal: abortSignal });
  const data = await response.json();
  return data.token;
}

interface TradeChatProps {
  channelId: string | null;
}

export function TradeChat({ channelId }: TradeChatProps) {
  const chatOptions: ChatElementOptions = useMemo(() => {
    return { channelId: channelId ?? "" };
  }, [channelId]);

  if (!channelId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Chat will be available once the trade is matched.
      </div>
    );
  }

  return (
    <Elements elements={elements}>
      <ChatSession token={getToken}>
        <ChatElement
          options={chatOptions}
          style={{ height: "500px", width: "100%" }}
        />
      </ChatSession>
    </Elements>
  );
}
