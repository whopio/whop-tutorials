import Link from 'next/link';
import { NavAccount } from '@/components/layout/NavAccount';
import { Button } from '@/components/ui';
import { NoSellerAccount } from '@/components/sell/NoSellerAccount';
import { VerificationButton } from '@/components/sell/VerificationButton';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { getWhopVerificationStatus } from '@/lib/whop-verification';
import { getFriendlyKycStatus } from '@/lib/kyc-status';

export default async function KycStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--gray-100)' }}>
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Sign in required</h1>
          <Link href="/login">
            <Button variant="primary">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id, kyc_status, whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return <NoSellerAccount context="To complete verification," error={params.error} />;
  }

  // Check Whop for real verification status (so verified users don't see "Complete Verification" again)
  let isVerified = seller.kyc_status === 'verified';
  let displayStatus = seller.kyc_status;

  if (seller.whop_company_id && process.env.WHOP_API_KEY) {
    const { verified: whopVerified, status: whopStatus } = await getWhopVerificationStatus(
      seller.whop_company_id,
      process.env.WHOP_API_KEY
    );
    if (whopVerified) {
      isVerified = true;
      displayStatus = 'verified';
      // Sync to our DB so we don't need to call Whop every time
      if (seller.kyc_status !== 'verified') {
        const supabaseAdmin = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await supabaseAdmin
          .from('seller_accounts')
          .update({ kyc_status: 'verified', kyc_verified_at: new Date().toISOString() })
          .eq('id', seller.id);
      }
    } else if (whopStatus) {
      displayStatus = whopStatus;
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-100)' }}>
      <NavAccount />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--white)' }}>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Identity verification
          </h1>
          <p className="mb-8" style={{ color: 'var(--gray-600)' }}>
            {isVerified
              ? 'Your identity has been verified. You can publish gigs.'
              : 'Complete identity verification to publish gigs and receive payouts.'}
          </p>
          {params.error === 'whop_not_configured' && (
            <div className="mb-6 rounded-lg bg-[#FEE2E2] p-4 text-sm text-[#DC2626]">
              Verification is temporarily unavailable. Please contact support.
            </div>
          )}
          {params.error === 'link_failed' && (
            <div className="mb-6 rounded-lg bg-[#FEE2E2] p-4 text-sm text-[#DC2626]">
              Could not start verification. Please try again.
            </div>
          )}
          <div className="mb-8 rounded-xl p-4" style={{ backgroundColor: 'var(--gray-100)' }}>
            <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
              Status: <strong>{getFriendlyKycStatus(displayStatus)}</strong>
            </p>
          </div>
          {!isVerified && (
            <VerificationButton className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 py-4 text-base font-medium text-white transition-all hover:opacity-90">
              Complete Verification
            </VerificationButton>
          )}
          {isVerified && (
            <Link
              href="/sell/gigs"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 py-4 text-base font-medium text-white transition-all hover:opacity-90"
            >
              Go to My Gigs
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
