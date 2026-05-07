import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const { rating, reviewText } = body as { rating?: number; reviewText?: string };

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be 1–5' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, gig_id, seller_user_id, buyer_user_id, status')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.buyer_user_id !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can leave a review' }, { status: 403 });
    }

    if (!['delivered', 'completed'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Review can only be left after delivery' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Review already submitted' }, { status: 400 });
    }

    const { error } = await supabase.from('reviews').insert({
      order_id: orderId,
      gig_id: order.gig_id,
      seller_user_id: order.seller_user_id,
      buyer_user_id: user.id,
      rating: Math.round(rating),
      body: typeof reviewText === 'string' ? reviewText.trim() || null : null,
    });

    if (error) {
      console.error('[review]', error);
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
    }

    if (order.status === 'delivered') {
      await supabase
        .from('orders')
        .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', orderId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[review]', err);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}
