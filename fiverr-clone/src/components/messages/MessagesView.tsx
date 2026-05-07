'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MessageSquare, ArrowLeft, MoreVertical } from 'lucide-react';
import { C, GFAvatar } from '@/components/gigflow/design-system';
import { ChatPanel } from './ChatPanel';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  gig_id: string | null;
  gig?: { title: string } | null;
  otherUser: { displayName: string; avatarUrl?: string | null };
  otherUserId: string;
  updated_at: string;
  lastMessage?: string | null;
  whop_channel_id?: string | null;
  /** Other participant has linked Whop; only use Whop chat when both have linked */
  otherUserHasWhop?: boolean;
}

interface MessagesViewProps {
  conversations: Conversation[];
  currentUserId: string;
  sellerId?: string | null;
  buyerId?: string | null;
  gigId?: string | null;
  gigTitle?: string | null;
  /** Map of conversation id -> Whop DM channel id (for live chat) */
  whopChannelIdByConvId?: Record<string, string>;
  /** When false, skip Whop chat and use Supabase Realtime only (e.g. user has not linked Whop) */
  currentUserHasWhop?: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export function MessagesView({
  conversations,
  currentUserId,
  sellerId,
  buyerId,
  gigId,
  gigTitle,
  whopChannelIdByConvId = {},
  currentUserHasWhop = true,
}: MessagesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convIdParam = searchParams.get('c');
  const [creating, setCreating] = useState(false);
  const [createFailed, setCreateFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const pendingConv = sellerId || buyerId;

  useEffect(() => {
    if (!pendingConv || creating || createFailed) return;
    const run = async () => {
      setCreating(true);
      setCreateFailed(false);
      try {
        const body = sellerId
          ? { sellerUserId: sellerId, gigId: gigId || undefined }
          : { buyerUserId: buyerId, gigId: gigId || undefined };
        const res = await fetch('/api/conversations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok && data.conversationId) {
          router.replace(`/messages?c=${data.conversationId}`);
        } else {
          setCreateFailed(true);
        }
      } catch {
        setCreateFailed(true);
      } finally {
        setCreating(false);
      }
    };
    run();
  }, [sellerId, buyerId, gigId, router, creating, pendingConv, createFailed]);

  const selectedId = convIdParam || (conversations[0]?.id);
  const selected = conversations.find((c) => c.id === selectedId);

  const filteredConvos = conversations.filter(
    (c) =>
      c.otherUser.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (c.gig?.title?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const selectConvo = (id: string) => {
    router.replace(`/messages?c=${id}`);
    setMobileShowChat(true);
  };

  if (pendingConv && !selectedId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 px-4">
        {createFailed ? (
          <>
            <p className="text-sm mb-4" style={{ color: C.muted }}>
              Could not start conversation. It may already exist.
            </p>
            <Link
              href="/messages"
              className="text-sm font-medium px-4 py-2 rounded-xl transition"
              style={{ color: C.brand, backgroundColor: C.brandMuted }}
            >
              Go to Messages
            </Link>
          </>
        ) : (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: C.border, borderTopColor: C.brand }} />
            <span className="ml-3 text-sm" style={{ color: C.muted }}>
              Starting conversation...
            </span>
          </>
        )}
      </div>
    );
  }

  return (
      <div
        className="flex flex-1 max-w-7xl w-full mx-auto px-4 py-4 gap-0 overflow-hidden"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        <div
          className={cn(
            'flex flex-col border-r overflow-hidden flex-shrink-0 transition-all',
            mobileShowChat ? 'w-0 md:w-80' : 'w-full md:w-80'
          )}
          style={{ backgroundColor: C.white, borderColor: C.border, borderRadius: '16px 0 0 16px' }}
        >
          <div className="px-5 pt-5 pb-3 border-b flex-shrink-0" style={{ borderColor: C.border }}>
            <h2 className="text-lg font-bold mb-3" style={{ color: C.ink }}>
              Messages
            </h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2"
                style={{ backgroundColor: C.surface, borderColor: C.border, color: C.ink, '--tw-ring-color': C.brand } as React.CSSProperties}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && !pendingConv ? (
              <div className="p-8 text-center">
                <MessageSquare size={48} className="mx-auto mb-4" style={{ color: C.border }} />
                <p className="text-sm" style={{ color: C.muted }}>
                  No conversations yet. Click &quot;Contact&quot; on a gig to start chatting with a seller.
                </p>
              </div>
            ) : (
              filteredConvos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConvo(c.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all border-b',
                    selectedId === c.id && 'border-l-2'
                  )}
                  style={{
                    backgroundColor: selectedId === c.id ? C.brandMuted : 'transparent',
                    borderColor: C.border,
                    borderLeftColor: selectedId === c.id ? C.brand : 'transparent',
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <GFAvatar src={c.otherUser.avatarUrl ?? undefined} name={c.otherUser.displayName} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-sm" style={{ color: C.ink }}>
                        {c.otherUser.displayName}
                      </span>
                      <span className="text-xs font-mono" style={{ color: C.muted }}>
                        {formatTime(c.updated_at)}
                      </span>
                    </div>
                    {c.gig?.title && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: C.surface, color: C.muted }}>
                          {c.gig.title}
                        </span>
                      </div>
                    )}
                    <p className="text-xs truncate" style={{ color: C.muted }}>
                      {c.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={cn(
            'flex flex-col flex-1 overflow-hidden transition-all min-w-0',
            !mobileShowChat ? 'hidden md:flex' : 'flex'
          )}
          style={{
            backgroundColor: C.white,
            borderRadius: '0 16px 16px 0',
            border: `1px solid ${C.border}`,
            borderLeft: 'none',
          }}
        >
          {selected ? (
            <>
              <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: C.border }}>
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-1 rounded-lg mr-1"
                  style={{ color: C.muted }}
                >
                  <ArrowLeft size={18} />
                </button>
                <GFAvatar src={selected.otherUser.avatarUrl ?? undefined} name={selected.otherUser.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: C.ink }}>
                    {selected.otherUser.displayName}
                  </p>
                  <p className="text-xs" style={{ color: C.muted }}>
                    {selected.gig?.title ? `${selected.gig.title} · Chat` : 'Chat'}
                  </p>
                </div>
                <button type="button" className="p-2 rounded-xl hover:bg-black/5 transition" style={{ color: C.muted }} aria-label="More">
                  <MoreVertical size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <ChatPanel
                  conversationId={selected.id}
                  otherUser={selected.otherUser}
                  currentUserId={currentUserId}
                  gigTitle={selected.gig?.title || gigTitle || undefined}
                  gigId={selected.gig_id || undefined}
                  whopChannelId={selected.whop_channel_id ?? whopChannelIdByConvId[selected.id] ?? undefined}
                  currentUserHasWhop={currentUserHasWhop}
                  otherUserHasWhop={selected.otherUserHasWhop ?? true}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center" style={{ color: C.muted }}>
              Select a conversation
            </div>
          )}
        </div>
      </div>
  );
}
