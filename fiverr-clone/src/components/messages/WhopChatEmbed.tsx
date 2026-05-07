'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import { ChatElement, ChatSession, Elements } from '@whop/embedded-components-react-js';
import type { ChatElementOptions } from '@whop/embedded-components-vanilla-js/types';

export interface WhopChatEmbedProps {
  channelId: string;
  onAuthRequired?: () => void;
}

const whopEnv =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT) || 'production';

/** Token endpoint: alias of /api/chat/token per Whop quickstart. */
const TOKEN_ENDPOINT = '/api/token';

const LOG = (step: string, detail?: object) => {
  if (typeof window !== 'undefined') {
    console.log(`[Whop] ${step}`, detail ?? '');
  }
};

export function WhopChatEmbed({ channelId, onAuthRequired }: WhopChatEmbedProps) {
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [chatReady, setChatReady] = useState(false);

  useEffect(() => {
    LOG('Embed step 1 — mount', { channelId: channelId ?? null, channelIdLength: channelId?.length ?? 0, environment: whopEnv });
  }, [channelId]);

  const elements = useMemo(() => {
    LOG('Embed step 2 — loadWhopElements', { environment: whopEnv });
    return loadWhopElements({ environment: whopEnv as 'production' | 'sandbox' });
  }, []);

  const getToken = useCallback(async () => {
    LOG('Embed step 4 — getToken called', { endpoint: TOKEN_ENDPOINT });
    try {
      const response = await fetch(TOKEN_ENDPOINT, { credentials: 'include' });
      const data = await response.json();
      LOG('Embed step 5 — token response', { status: response.status, ok: response.ok, hasToken: Boolean((data as { token?: string }).token), error: (data as { error?: string }).error });
      if (!response.ok) throw new Error((data as { error?: string }).error || `HTTP ${response.status}`);
      const token = (data as { token?: string }).token;
      if (!token) throw new Error('No token in response');
      setTokenError(null);
      LOG('Embed step 6 — token obtained (success)');
      return token;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load chat';
      LOG('Embed step 6 — token failed', { error: msg });
      setTokenError(msg);
      onAuthRequired?.();
      throw err;
    }
  }, [onAuthRequired]);

  const chatOptions: ChatElementOptions = useMemo(
    () => {
      LOG('Embed step 3 — chatOptions built', { channelId, channelIdLength: channelId?.length ?? 0 });
      return {
        channelId,
        emptyState: {
          title: 'No messages yet',
          description: 'Send a message to start the conversation.',
        },
        onReady: () => {
          LOG('Embed step 7 — ChatElement onReady (embed ready for interaction)');
          setChatReady(true);
        },
      };
    },
    [channelId],
  );

  if (tokenError) {
    LOG('Embed render — showing token error UI', { tokenError });
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <div className="flex-shrink-0 mx-2 mt-2 px-3 py-1.5 rounded-lg text-xs border border-red-200 bg-red-50 text-gray-800">
          {tokenError}
          <Link href="/account/settings" className="block mt-1.5 font-medium text-orange-600 underline">
            Link Whop in Account Settings →
          </Link>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 text-sm text-gray-500" style={{ minHeight: 200 }}>
          Live chat unavailable — use the messages below.
        </div>
      </div>
    );
  }

  // channelId is the DM channel id from GET /api/conversations/[id]/whop-channel (dmChannel.id). ChatElement accepts this for DMs; no "feed" id needed.
  if (!channelId?.trim()) {
    LOG('Embed render — no channelId, showing fallback');
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-500 p-4">
        No chat channel. Use the messages below.
      </div>
    );
  }

  LOG('Embed step 8 — rendering Elements/ChatSession/ChatElement', { channelId });
  return (
    <div className="flex flex-1 flex-col min-h-0 h-full">
      {/* Absolute fill so the embed (iframe) gets a definite size; otherwise skeleton can show and input stays disabled. */}
      <div className="flex-1 min-h-0 w-full relative" style={{ minHeight: 360 }}>
        {/* Clean loading overlay until embed is ready — no "Connecting" / "Chat ready" text */}
        {!chatReady && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--gray-50)] transition-opacity duration-300"
            style={{ minHeight: 360 }}
            aria-hidden={chatReady}
          >
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray-200)]"
              style={{ borderTopColor: 'var(--primary)' }}
            />
          </div>
        )}
        <div
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: 360 }}
          aria-hidden={false}
        >
          <Elements
            elements={elements}
            appearance={{
              theme: {
                appearance: 'light',
                accentColor: 'orange',
                grayColor: 'gray',
              },
            }}
          >
            <ChatSession token={getToken}>
              <ChatElement
                options={chatOptions}
                style={{ height: '100%', width: '100%', minHeight: 360 }}
              />
            </ChatSession>
          </Elements>
        </div>
      </div>
    </div>
  );
}
