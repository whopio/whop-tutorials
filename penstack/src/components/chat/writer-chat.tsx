"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChatElement,
  ChatSession,
  Elements,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import type { ChatElementOptions } from "@whop/embedded-components-vanilla-js/types";

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
  // Load the elements runtime on the client only (avoids SSR window access).
  const [elements, setElements] = useState<ReturnType<
    typeof loadWhopElements
  > | null>(null);

  useEffect(() => {
    setElements(loadWhopElements());
  }, []);

  const chatOptions: ChatElementOptions = useMemo(
    () => ({ channelId }),
    [channelId]
  );

  if (!elements) {
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
            options={chatOptions}
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
