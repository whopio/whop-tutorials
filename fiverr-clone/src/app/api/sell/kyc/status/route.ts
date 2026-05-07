import { createClient } from '@/lib/supabase/server';
import { getWhopVerificationStatus } from '@/lib/whop-verification';
import { NextResponse } from 'next/server';

/** Returns verification status from Whop Ledger API. */
export async function GET() {
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

  if (!seller?.whop_company_id || !process.env.WHOP_API_KEY) {
    return NextResponse.json({ verified: false, status: 'no_account' });
  }

  const { verified, status } = await getWhopVerificationStatus(
    seller.whop_company_id,
    process.env.WHOP_API_KEY
  );

  return NextResponse.json({ verified, status, companyId: seller.whop_company_id });
}
