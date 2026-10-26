import { NextRequest, NextResponse } from 'next/server';
import { unwrapWebhook } from '@whop/sdk/helpers';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Whop webhook receiver: the server-to-server source of truth for payments,
 * KYC verification, refunds and disputes. It runs whatever the browser does
 * after checkout, so a closed tab never leaves a payment unrecorded.
 *
 * Subscribe to: payment succeeded, verification succeeded, refund created and
 * updated, dispute created and updated.
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  // Step 1: Verify the signature and parse the payload.
  // If the signature is invalid, the SDK will throw and we return 401.
  // Depending on the webhook's API version, the account arrives as account_id or company_id.
  let webhook: { id: string; type: string; account_id?: string; company_id?: string; data: unknown };
  try {
    webhook = unwrapWebhook<typeof webhook>(bodyText, {
      headers,
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  // Step 2: Store the event idempotently.
  // The webhook_id unique constraint prevents duplicate processing.
  // If this event has already been processed, return 200 immediately.
  const accountId = webhook.account_id ?? webhook.company_id;
  const { error: insertError } = await supabaseAdmin.from('webhook_events').insert({
    webhook_id: webhook.id,
    type: webhook.type,
    company_id: accountId ?? null,
    payload: JSON.parse(bodyText),
  });

  if (insertError?.code === '23505') {
    // Unique constraint violation: already processed. This is expected for retries.
    return NextResponse.json({ ok: true });
  }

  if (insertError) {
    console.error('[webhook] Failed to store event:', insertError);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  // Step 3: Route by event type. The payload type uses dots (payment.succeeded),
  // not the dashboard's underscores.
  // Respond with 200 quickly. Whop will retry if you do not respond within a few seconds.
  try {
    switch (webhook.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(webhook.data, accountId, supabaseAdmin);
        break;
      case 'verification.succeeded':
        await handleVerificationSucceeded(accountId, supabaseAdmin);
        break;
      case 'refund.created':
      case 'refund.updated':
        await handleRefund(webhook.data, supabaseAdmin);
        break;
      case 'dispute.created':
      case 'dispute.updated':
        await handleDispute(webhook.data, supabaseAdmin);
        break;
      default:
        // Log unhandled events but do not fail
        console.log(`[webhook] Unhandled event type: ${webhook.type}`);
    }
  } catch (err) {
    console.error(`[webhook] Handler error for ${webhook.type}:`, err);
    // Still return 200 to prevent Whop from retrying an event we already stored.
    // Log the error and investigate separately.
  }

  return NextResponse.json({ ok: true });
}

// Older webhook versions send plain numbers, newer ones send money objects
// like { amount: "29.00" }. Read both as cents.
type MoneyField = number | { amount: string } | null | undefined;

function toCents(value: MoneyField): number | null {
  if (typeof value === 'number') return Math.round(value * 100);
  if (value?.amount != null) return Math.round(Number(value.amount) * 100);
  return null;
}

async function handlePaymentSucceeded(
  data: unknown,
  accountId: string | undefined,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  // Older webhook versions send company: { id }, newer ones send account_id.
  const payment = data as {
    id: string;
    account_id?: string | null;
    company?: { id: string } | null;
    status: string;
    currency?: string | null;
    total?: MoneyField;
    amount_after_fees?: MoneyField;
    application_fee?: { amount: number } | null;
    checkout_configuration_id?: string | null;
    metadata?: Record<string, string> | null;
  };

  // Attach the payment to its order. The checkout metadata never carries an
  // order id (the order is created after payment), so match on the checkout
  // configuration id the confirm route stores on the order. If the order
  // doesn't exist yet, the confirm route links this row when it creates it.
  let orderId = payment.metadata?.order_id ?? null;
  if (!orderId && payment.checkout_configuration_id) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('whop_checkout_config_id', payment.checkout_configuration_id)
      .maybeSingle();
    orderId = order?.id ?? null;
  }

  // Upsert the payment record. Seller earnings read amount_after_fees_cents,
  // the admin dashboard reads total_cents and application_fee_cents.
  await supabaseAdmin.from('whop_payments').upsert(
    {
      whop_payment_id: payment.id,
      whop_company_id: payment.account_id ?? payment.company?.id ?? accountId,
      ...(orderId ? { order_id: orderId } : {}),
      status: payment.status,
      total_cents: toCents(payment.total),
      amount_after_fees_cents: toCents(payment.amount_after_fees),
      application_fee_cents: toCents(payment.application_fee?.amount),
      currency: payment.currency ?? null,
      raw: payment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'whop_payment_id' }
  );
}

async function handleVerificationSucceeded(
  companyId: string | undefined,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  if (!companyId) return;

  await supabaseAdmin
    .from('seller_accounts')
    .update({
      kyc_status: 'verified',
      kyc_verified_at: new Date().toISOString(),
      payout_enabled: true,
    })
    .eq('whop_company_id', companyId);
}

async function handleRefund(
  data: unknown,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  const refund = data as { payment_id?: string; payment?: { id: string } | null };
  const paymentId = refund.payment_id ?? refund.payment?.id;
  if (!paymentId) return;

  const { data: payment } = await supabaseAdmin
    .from('whop_payments')
    .select('order_id')
    .eq('whop_payment_id', paymentId)
    .maybeSingle();

  if (payment?.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id);
  }
}

async function handleDispute(
  data: unknown,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  const dispute = data as { payment_id?: string; payment?: { id: string } | null };
  const paymentId = dispute.payment_id ?? dispute.payment?.id;
  if (!paymentId) return;

  const { data: payment } = await supabaseAdmin
    .from('whop_payments')
    .select('order_id')
    .eq('whop_payment_id', paymentId)
    .maybeSingle();

  if (payment?.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id);
  }
}
