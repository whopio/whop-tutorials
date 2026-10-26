import { NextResponse } from 'next/server';
import { WhopClient, WhopEnvironment } from '@whop/sdk';
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

    // Payouts always go to a saved payout method
    if (!payoutMethodId) {
      return NextResponse.json({ error: 'Add a payout method before withdrawing' }, { status: 400 });
    }

    const whop = new WhopClient({
      token: apiKey,
      environment:
        process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === 'production'
          ? WhopEnvironment.Production
          : WhopEnvironment.Sandbox,
    });

    const withdrawal = await whop.payouts.create({
      account_id: seller.whop_company_id,
      amount,
      currency,
      payout_method_id: payoutMethodId,
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
