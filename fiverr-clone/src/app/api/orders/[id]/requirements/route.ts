import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

  if (order.status !== 'awaiting_requirements') {
    return NextResponse.json(
      { error: 'Requirements already submitted or order not in awaiting state' },
      { status: 400 }
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !order.buyer_user_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (order.buyer_user_id && order.buyer_user_id !== user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { answers?: Record<string, string>; attachments?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  const { error: upsertError } = await supabase
    .from('order_requirements')
    .upsert(
      {
        order_id: orderId,
        answers,
        attachments,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    );

  if (upsertError) {
    console.error('[order requirements]', upsertError);
    return NextResponse.json(
      { error: 'Failed to submit requirements' },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateError) {
    console.error('[order status update]', updateError);
  }

  return NextResponse.json({ ok: true });
}
