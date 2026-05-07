import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/app-url';

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
      return NextResponse.json({ error: 'Complete verification first' }, { status: 400 });
    }

    const whop = new Whop({ apiKey });
    const { token } = await whop.accessTokens.create({
      company_id: seller.whop_company_id,
    });

    const baseUrl = getAppBaseUrl();
    const redirectUrl = `${baseUrl.replace(/^http:\/\//, 'https://')}/sell/dashboard`;

    return NextResponse.json({ token, companyId: seller.whop_company_id, redirectUrl });
  } catch (err) {
    console.error('[sell payouts-token]', err);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
