import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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
      return NextResponse.json({ payoutMethods: [], message: 'Complete verification first' });
    }

    const whop = new Whop({ apiKey });
    const methods: Array<{
      id: string;
      account_reference: string | null;
      institution_name: string | null;
      nickname: string | null;
      is_default: boolean;
      currency: string;
      category?: string;
      name?: string;
    }> = [];

    for await (const pm of whop.payoutMethods.list({ company_id: seller.whop_company_id, first: 20 })) {
      const dest = pm.destination as { category?: string; name?: string } | null;
      methods.push({
        id: pm.id,
        account_reference: pm.account_reference ?? null,
        institution_name: pm.institution_name ?? null,
        nickname: pm.nickname ?? null,
        is_default: pm.is_default ?? false,
        currency: pm.currency ?? 'usd',
        category: dest?.category ?? undefined,
        name: dest?.name ?? undefined,
      });
    }

    return NextResponse.json({ payoutMethods: methods });
  } catch (err) {
    console.error('[sell payout-methods]', err);
    return NextResponse.json(
      { error: 'Failed to fetch payout methods', payoutMethods: [] },
      { status: 500 }
    );
  }
}
