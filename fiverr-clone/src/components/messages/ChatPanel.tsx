'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Paperclip, Image, Send, Check, CheckCheck } from 'lucide-react';
import { C, GFAvatar } from '@/components/gigflow/design-system';
import { WhopChatEmbed } from './WhopChatEmbed';

interface Message {
  id: string;
  body: string;
  sender_user_id: string;
  created_at: string;
}

interface ChatPanelProps {
  conversationId: string;
  otherUser: { displayName: string; avatarUrl?: string | null };
  currentUserId: string;
  gigTitle?: string | null;
  gigId?: string | null;
  /** Whop DM channel id for live chat (from Whop API); when set we can embed Whop chat */
  whopChannelId?: string | null;
  /** When false, skip Whop and use Supabase Realtime (current user has not linked Whop) */
  currentUserHasWhop?: boolean;
  /** When false, skip Whop and use Supabase Realtime (other user has not linked Whop). Use Whop only when both have linked. */
  otherUserHasWhop?: boolean;
}

export function ChatPanel({
  conversationId,
  otherUser,
  currentUserId,
  gigTitle,
  gigId,
  whopChannelId: whopChannelIdProp,
  currentUserHasWhop = true,
  otherUserHasWhop = true,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [whopChannelIdResolved, setWhopChannelIdResolved] = useState<string | null>(null);
  const [whopError, setWhopError] = useState<string | null>(null);
  const [useWhop, setUseWhop] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const bothUsersHaveWhop = currentUserHasWhop && otherUserHasWhop;
  const whopChannelId = whopChannelIdProp ?? whopChannelIdResolved;
  const showWhop = Boolean(bothUsersHaveWhop && whopChannelId && useWhop);

  const supabase = createClient();

  // Ensure Whop DM channel exists only when current user has linked Whop; otherwise use Supabase Realtime only
  useEffect(() => {
    if (!currentUserHasWhop) {
      setWhopError(null);
      return;
    }
    if (whopChannelId) {
      return;
    }
    setWhopError(null);
    let cancelled = false;
    fetch(`/api/conversations/${conversationId}/whop-channel`, { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && data?.channelId) {
          setWhopChannelIdResolved(data.channelId);
          setWhopError(null);
        } else {
          setWhopError(typeof data?.error === 'string' ? data.error : 'Live chat is not available for this conversation.');
        }
      })
      .catch(() => {
        if (!cancelled) setWhopError('Could not load live chat.');
      });
    return () => { cancelled = true; };
  }, [conversationId, whopChannelId, currentUserHasWhop]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('conversation_messages')
        .select('id, body, sender_user_id, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages((data || []) as Message[]);
    };
    load();
  }, [conversationId]);

  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => [...prev, row]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        setInput(text);
      }
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const formatMsgTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {gigTitle && (
        <div
          className="mx-4 mt-3 mb-1 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs flex-shrink-0"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <span style={{ color: C.muted }}>
            <span className="font-mono font-semibold" style={{ color: C.ink }}>{gigTitle}</span>
          </span>
          <Link href={`/search?q=${encodeURIComponent(gigTitle)}`} className="font-medium hover:opacity-70 transition" style={{ color: C.brand }}>
            View gig →
          </Link>
        </div>
      )}
      {/* Whop live chat when channel exists and auth OK; otherwise Supabase chat. See docs/WHOP_CHAT_SETUP.md */}
      {showWhop && whopChannelId ? (
        <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
          <WhopChatEmbed
            channelId={whopChannelId as string}
            onAuthRequired={() => setUseWhop(false)}
          />
        </div>
      ) : null}
      {!showWhop && (
        <>
      {/* Supabase Realtime when either user has not linked Whop, or Whop failed */}
      {!bothUsersHaveWhop && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg text-xs flex-shrink-0" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>
          Using in-app messages. Live chat requires both you and the other person to <Link href="/account/settings" className="underline">link Whop in Account Settings</Link>.
        </div>
      )}
      {whopChannelId && useWhop === false && !whopError && bothUsersHaveWhop && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg text-xs flex-shrink-0" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>
          Live chat wasn’t available; using in-app messages below.
        </div>
      )}
      {whopError && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg text-xs flex-shrink-0" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>
          {whopError} <Link href="/account/settings" className="underline">Account Settings</Link>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => {
          const isMe = m.sender_user_id === currentUserId;
          const showAvatar = !isMe && (i === 0 || (messages[i - 1] && messages[i - 1].sender_user_id === currentUserId));
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <div className="w-7 flex-shrink-0">
                  {showAvatar ? <GFAvatar src={otherUser.avatarUrl ?? undefined} name={otherUser.displayName} size="xs" /> : null}
                </div>
              )}
              <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    backgroundColor: isMe ? C.ink : C.surface,
                    color: isMe ? C.white : C.ink,
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}
                >
                  {m.body}
                </div>
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] font-mono" style={{ color: C.subtle }}>{formatMsgTime(m.created_at)}</span>
                  {isMe && <CheckCheck size={12} style={{ color: C.brand }} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: C.border }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 p-2 rounded-2xl border"
          style={{ borderColor: C.border, backgroundColor: C.surface }}
        >
          <div className="flex items-center gap-1 mb-1.5 ml-1">
            <button type="button" className="p-1.5 rounded-lg hover:bg-black/10 transition" style={{ color: C.muted }}>
              <Paperclip size={16} />
            </button>
            <button type="button" className="p-1.5 rounded-lg hover:bg-black/10 transition" style={{ color: C.muted }}>
              <Image size={16} />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message..."
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none min-h-[36px] max-h-[120px] py-1.5"
            style={{ color: C.ink }}
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="mb-1.5 mr-1 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
            style={{ background: input.trim() ? `linear-gradient(135deg, ${C.brandLight}, ${C.brand})` : C.border }}
          >
            <Send size={15} color="white" />
          </button>
        </form>
      </div>
        </>
      )}
    </div>
  );
}
