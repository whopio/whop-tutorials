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
    .select('id, status, seller_user_id, buyer_user_id, gig_id')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || order.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validStatuses = ['in_progress', 'revision_requested'];
  if (!validStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: 'Order is not in a state that allows delivery' },
      { status: 400 }
    );
  }

  let body: { message?: string; items?: Array<{ url: string; name?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const items = Array.isArray(body.items)
    ? (body.items as Array<{ url?: string; name?: string }>)
        .filter((i) => typeof i?.url === 'string' && i.url.trim())
        .map((i) => ({ url: (i.url as string).trim(), name: typeof i.name === 'string' ? i.name.trim() : undefined }))
    : [];

  const { error: insertError } = await supabase.from('order_deliveries').insert({
    order_id: orderId,
    message: message || null,
    items,
  });

  if (insertError) {
    console.error('[order deliver]', insertError);
    return NextResponse.json({ error: 'Failed to save delivery' }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateError) {
    console.error('[order status]', updateError);
  }

  if (order.buyer_user_id) {
    let gigTitle = 'Order';
    if (order.gig_id) {
      const { data: gig } = await supabase
        .from('gigs')
        .select('title')
        .eq('id', order.gig_id)
        .single();
      if (gig?.title) gigTitle = gig.title;
    }
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseAdmin.from('notifications').insert({
      user_id: order.buyer_user_id,
      type: 'order',
      title: 'Delivery received',
      body: gigTitle,
      link: `/orders/${orderId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
