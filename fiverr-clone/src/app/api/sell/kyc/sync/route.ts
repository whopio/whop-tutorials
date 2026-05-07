import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { getWhopVerificationStatus } from '@/lib/whop-verification';
import { getWhopOwnerUserId } from '@/lib/whop-owner';
import { NextResponse } from 'next/server';

/**
 * Sync KYC status from Whop ledger API to our DB.
 * Call this when user returns from Whop verification so we immediately know if they're verified.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id, kyc_status, whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (!seller?.whop_company_id || !process.env.WHOP_API_KEY) {
    return NextResponse.json({ verified: false, synced: false });
  }

  const { verified } = await getWhopVerificationStatus(
    seller.whop_company_id,
    process.env.WHOP_API_KEY
  );

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (verified && seller.kyc_status !== 'verified') {
    await supabaseAdmin
      .from('seller_accounts')
      .update({ kyc_status: 'verified', kyc_verified_at: new Date().toISOString() })
      .eq('id', seller.id);
  }

  // Sync seller's Whop user ID from ledger/company owner so they can use DMs and chat
  const whopOwnerUserId = await getWhopOwnerUserId(seller.whop_company_id, process.env.WHOP_API_KEY!);
  if (whopOwnerUserId) {
    await supabaseAdmin
      .from('profiles')
      .update({ whop_user_id: whopOwnerUserId, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
  }

  return NextResponse.json({ verified, synced: true });
}
