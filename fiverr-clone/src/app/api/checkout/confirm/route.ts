import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';

/**
 * Creates an order after payment is confirmed. Called from onComplete or when
 * user lands on checkout/complete with session_id (e.g. after external redirect).
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Whop is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { session_id, receipt_id } = body as { session_id?: string; receipt_id?: string };

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }

    const client = new Whop({ apiKey });
    const config = await client.checkoutConfigurations.retrieve(session_id);

    const meta = (config.metadata || {}) as Record<string, string>;
    const gigId = meta.gig_id;
    const packageId = meta.package_id;
    const quantity = parseInt(meta.quantity || '1', 10);
    const extrasIds = meta.extras_ids ? meta.extras_ids.split(',').filter(Boolean) : [];
    const buyerUserId = meta.buyer_user_id || null;

    if (!gigId || !packageId) {
      return NextResponse.json(
        { error: 'Invalid checkout metadata' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: gig } = await supabase
      .from('gigs')
      .select('id, seller_user_id, requirements_schema, title')
      .eq('id', gigId)
      .single();

    if (!gig) {
      return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
    }

    const requirementsSchema = (gig.requirements_schema || []) as Array<{
      id: string;
      type: string;
      question: string;
      required: boolean;
    }>;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        gig_id: gig.id,
        package_id: packageId,
        seller_user_id: gig.seller_user_id,
        buyer_user_id: buyerUserId,
        status: 'awaiting_requirements',
        requirements_schema: requirementsSchema,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[checkout confirm] Order insert:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    const gigTitle = gig.title || 'Order';
    const notificationsToInsert: { user_id: string; type: string; title: string; body: string; link: string }[] = [
      {
        user_id: gig.seller_user_id,
        type: 'order',
        title: 'New order received',
        body: gigTitle,
        link: '/sell/orders',
      },
    ];
    if (buyerUserId) {
      notificationsToInsert.push({
        user_id: buyerUserId,
        type: 'order',
        title: 'Order confirmed',
        body: gigTitle,
        link: `/orders/${order.id}`,
      });
    }
    await supabaseAdmin.from('notifications').insert(notificationsToInsert);

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error('[checkout confirm]', err);
    return NextResponse.json(
      { error: 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
