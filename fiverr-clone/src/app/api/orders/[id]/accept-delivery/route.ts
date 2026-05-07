import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, buyer_user_id')
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
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('[accept delivery]', error);
    return NextResponse.json({ error: 'Failed to complete order' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
