import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Whop not configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: seller } = await supabase
      .from('seller_accounts')
      .select('whop_company_id')
      .eq('user_id', user.id)
      .single();

    if (!seller?.whop_company_id) {
      return NextResponse.json({ error: 'Complete verification to withdraw' }, { status: 400 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const currency = (body.currency || 'usd').toLowerCase();
    const payoutMethodId = body.payout_method_id || null;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const whop = new Whop({ apiKey });

    const withdrawal = await whop.withdrawals.create({
      company_id: seller.whop_company_id,
      amount,
      currency: currency as 'usd' | 'eur' | 'gbp',
      ...(payoutMethodId && { payout_method_id: payoutMethodId }),
    });

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawal.id,
      status: withdrawal.status,
      amount: withdrawal.amount,
    });
  } catch (err) {
    console.error('[sell withdraw]', err);
    const msg = err instanceof Error ? err.message : 'Failed to create withdrawal';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
