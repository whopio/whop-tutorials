import { redirect } from 'next/navigation';
import { NavAccount } from '@/components/layout/NavAccount';
import { MessagesView } from '@/components/messages/MessagesView';
import { C } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/server';

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; sellerId?: string; buyerId?: string; gigId?: string; gigTitle?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;

  if (!user) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/login?next=${encodeURIComponent('/messages' + (qs ? '?' + qs : ''))}`);
  }
  const { sellerId, buyerId, gigId, gigTitle } = params;

  const { data: profile } = await supabase
    .from('profiles')
    .select('whop_user_id')
    .eq('user_id', user.id)
    .single();
  const currentUserHasWhop = Boolean(profile?.whop_user_id);

  const { data: convRows } = await supabase
    .from('conversations')
    .select(`
      id,
      buyer_user_id,
      seller_user_id,
      gig_id,
      updated_at,
      whop_channel_id,
      gigs(title)
    `)
    .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const profiles = new Map<string, { display_name?: string; username?: string; avatar_url?: string; whop_user_id?: string | null }>();
  const convs = (convRows || []).map((c) => {
    const otherId = c.buyer_user_id === user.id ? c.seller_user_id : c.buyer_user_id;
    const gigData = (c as unknown as { gigs?: { title: string } | null }).gigs;
    return {
      ...c,
      otherUserId: otherId,
      otherUser: null as { displayName: string; avatarUrl?: string | null } | null,
      gig: gigData ? { title: gigData.title } : null,
    };
  });

  const otherIds = [...new Set(convs.map((c) => c.otherUserId))];
  if (otherIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url, whop_user_id')
      .in('user_id', otherIds);
    (profs || []).forEach((p) => profiles.set(p.user_id, p));
  }

  const convIds = convs.map((c) => c.id);
  const lastMessages = new Map<string, { body: string; fromMe: boolean }>();
  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from('conversation_messages')
      .select('conversation_id, body, sender_user_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });
    for (const m of msgs || []) {
      const cid = m.conversation_id as string;
      if (!lastMessages.has(cid)) {
        lastMessages.set(cid, { body: m.body, fromMe: m.sender_user_id === user.id });
      }
    }
  }

  const conversations = convs.map((c) => {
    const p = profiles.get(c.otherUserId);
    const last = lastMessages.get(c.id);
    return {
      id: c.id,
      gig_id: c.gig_id,
      gig: c.gig ? { title: c.gig.title } : null,
      otherUser: {
        displayName: p?.display_name || p?.username || 'User',
        avatarUrl: p?.avatar_url,
      },
      otherUserId: c.otherUserId,
      updated_at: c.updated_at,
      lastMessage: last?.body || null,
      whop_channel_id: (c as { whop_channel_id?: string | null }).whop_channel_id ?? null,
      otherUserHasWhop: Boolean(p?.whop_user_id),
    };
  });

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <MessagesView
          conversations={conversations}
          currentUserId={user.id}
          sellerId={sellerId || null}
          buyerId={buyerId || null}
          gigId={gigId || null}
          gigTitle={gigTitle ? decodeURIComponent(gigTitle) : null}
          whopChannelIdByConvId={conversations.reduce<Record<string, string>>((acc, c) => { if (c.whop_channel_id) acc[c.id] = c.whop_channel_id; return acc; }, {})}
          currentUserHasWhop={currentUserHasWhop}
        />
      </div>
    </div>
  );
}
