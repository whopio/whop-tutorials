import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { body: messageBody } = body as { body?: string };
    if (!messageBody?.trim()) {
      return NextResponse.json({ error: 'Message body required' }, { status: 400 });
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('buyer_user_id, seller_user_id')
      .eq('id', conversationId)
      .single();

    if (!conv || (conv.buyer_user_id !== user.id && conv.seller_user_id !== user.id)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: msg, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        sender_user_id: user.id,
        body: messageBody.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('[messages create]', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    const recipientId = conv.buyer_user_id === user.id ? conv.seller_user_id : conv.buyer_user_id;
    if (recipientId) {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', user.id)
        .single();
      const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'message',
        title: `New message from ${senderName}`,
        body: messageBody.trim().slice(0, 100) + (messageBody.trim().length > 100 ? '...' : ''),
        link: `/messages?c=${conversationId}`,
      });
    }

    return NextResponse.json(msg);
  } catch (err) {
    console.error('[messages create]', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
