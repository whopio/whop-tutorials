import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, buyer_user_id, seller_user_id')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || order.buyer_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'Order is not delivered yet' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'revision_requested',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('[request revision]', error);
    return NextResponse.json({ error: 'Failed to request revision' }, { status: 500 });
  }

  if (order.seller_user_id) {
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseAdmin.from('notifications').insert({
      user_id: order.seller_user_id,
      type: 'order',
      title: 'Revision requested',
      body: `Order ${orderId.slice(0, 8).toUpperCase()}`,
      link: `/orders/${orderId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
