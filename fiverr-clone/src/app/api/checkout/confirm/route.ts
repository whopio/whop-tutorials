import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { WhopClient, WhopEnvironment } from '@whop/sdk';
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

    const client = new WhopClient({
      token: apiKey,
      environment:
        process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === 'production'
          ? WhopEnvironment.Production
          : WhopEnvironment.Sandbox,
    });
    const config = await client.checkoutConfigurations.retrieve({ id: session_id });

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

    // Idempotency: this endpoint can fire twice (onComplete and the
    // checkout/complete redirect). One order per checkout session.
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('whop_checkout_config_id', session_id)
      .maybeSingle();

    if (existingOrder) {
      return NextResponse.json({ orderId: existingOrder.id });
    }

    // Only a paid checkout becomes an order. Anyone can call this route with
    // a checkout id, so we ask Whop for the payment instead of trusting the request.
    const { data: seller } = await supabaseAdmin
      .from('seller_accounts')
      .select('whop_company_id')
      .eq('user_id', gig.seller_user_id)
      .single();

    const payment = await findPaidPayment(client, {
      sessionId: session_id,
      receiptId: receipt_id,
      accountId: seller?.whop_company_id ?? undefined,
      planId: config.plan?.id,
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        gig_id: gig.id,
        package_id: packageId,
        seller_user_id: gig.seller_user_id,
        buyer_user_id: buyerUserId,
        status: 'awaiting_requirements',
        requirements_schema: requirementsSchema,
        // Lets the payment webhook reconcile the Whop payment to this order.
        whop_checkout_config_id: session_id,
      })
      .select('id')
      .single();

    if (orderError?.code === '23505') {
      // A parallel confirm for the same session won the insert.
      const { data: raced } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('whop_checkout_config_id', session_id)
        .single();
      if (raced) return NextResponse.json({ orderId: raced.id });
    }

    if (orderError || !order) {
      console.error('[checkout confirm] Order insert:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // The payment webhook may have arrived before this order existed.
    await supabaseAdmin
      .from('whop_payments')
      .update({ order_id: order.id })
      .eq('whop_payment_id', payment.id)
      .is('order_id', null);

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

/**
 * Returns the paid payment made through this checkout configuration, or null.
 * The embed's onComplete passes the payment id. The checkout/complete redirect
 * doesn't, so then we look through the paid payments on the checkout's plan.
 */
async function findPaidPayment(
  client: WhopClient,
  {
    sessionId,
    receiptId,
    accountId,
    planId,
  }: { sessionId: string; receiptId?: string; accountId?: string; planId?: string }
) {
  if (receiptId?.startsWith('pay_')) {
    const payment = await client.payments.retrieve({ id: receiptId });
    return payment.checkout_configuration_id === sessionId && payment.status === 'paid'
      ? payment
      : null;
  }

  if (!planId) return null;
  const payments = await client.payments.list({
    account_id: accountId,
    plan_id: planId,
    status: 'paid',
  });
  for await (const payment of payments) {
    if (payment.checkout_configuration_id === sessionId && payment.status === 'paid') {
      return payment;
    }
  }
  return null;
}
