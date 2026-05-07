import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sellerUserId, buyerUserId, gigId } = body as { sellerUserId?: string; buyerUserId?: string; gigId?: string };

    if (buyerUserId) {
      const { data: seller } = await supabase
        .from('seller_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!seller) {
        return NextResponse.json({ error: 'Not a seller' }, { status: 403 });
      }
      if (user.id === buyerUserId) {
        return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
      }

      const existingQuery = supabase
        .from('conversations')
        .select('id')
        .eq('buyer_user_id', buyerUserId)
        .eq('seller_user_id', user.id);
      const existingRes = gigId
        ? await existingQuery.eq('gig_id', gigId).single()
        : await existingQuery.is('gig_id', null).single();

      if (existingRes.data?.id) {
        return NextResponse.json({ conversationId: existingRes.data.id });
      }

      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({
          buyer_user_id: buyerUserId,
          seller_user_id: user.id,
          gig_id: gigId || null,
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          const retryQuery = supabase
            .from('conversations')
            .select('id')
            .eq('buyer_user_id', buyerUserId)
            .eq('seller_user_id', user.id);
          const retryRes = gigId
            ? await retryQuery.eq('gig_id', gigId).single()
            : await retryQuery.is('gig_id', null).single();
          if (retryRes.data?.id) return NextResponse.json({ conversationId: retryRes.data.id });
        }
        console.error('[conversations create]', error);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }
      return NextResponse.json({ conversationId: conv!.id });
    }

    if (!sellerUserId) {
      return NextResponse.json({ error: 'Missing sellerUserId or buyerUserId' }, { status: 400 });
    }

    if (user.id === sellerUserId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    const existingQuery = supabase
      .from('conversations')
      .select('id')
      .eq('buyer_user_id', user.id)
      .eq('seller_user_id', sellerUserId);
    const existingRes = gigId
      ? await existingQuery.eq('gig_id', gigId).single()
      : await existingQuery.is('gig_id', null).single();

    if (existingRes.data?.id) {
      return NextResponse.json({ conversationId: existingRes.data.id });
    }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({
        buyer_user_id: user.id,
        seller_user_id: sellerUserId,
        gig_id: gigId || null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        const retryQuery = supabase
          .from('conversations')
          .select('id')
          .eq('buyer_user_id', user.id)
          .eq('seller_user_id', sellerUserId);
        const retryRes = gigId
          ? await retryQuery.eq('gig_id', gigId).single()
          : await retryQuery.is('gig_id', null).single();
        if (retryRes.data?.id) return NextResponse.json({ conversationId: retryRes.data.id });
      }
      console.error('[conversations create]', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    return NextResponse.json({ conversationId: conv!.id });
  } catch (err) {
    console.error('[conversations create]', err);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
