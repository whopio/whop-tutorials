import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NavAccount } from '@/components/layout/NavAccount';
import { VerificationButton } from '@/components/sell/VerificationButton';
import { createClient } from '@/lib/supabase/server';
import { getWhopVerificationStatus } from '@/lib/whop-verification';

export default async function BecomeSellerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?signup=1&next=/sell/onboarding');
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id, kyc_status, whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (seller) {
    let isVerified = seller.kyc_status === 'verified';
    if (seller.whop_company_id && process.env.WHOP_API_KEY) {
      const { verified } = await getWhopVerificationStatus(
        seller.whop_company_id,
        process.env.WHOP_API_KEY
      );
      if (verified) isVerified = true;
    }
    if (isVerified) {
      redirect('/sell/gigs');
    }
    redirect('/sell/kyc');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-100)' }}>
      <NavAccount />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--white)' }}>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Become a Seller
          </h1>
          <p className="mb-8" style={{ color: 'var(--gray-600)' }}>
            Start selling your services on gigflow. Complete the steps below.
          </p>
          {params.error === 'whop_not_configured' && (
            <div className="mb-6 rounded-lg bg-[#FEE2E2] p-4 text-sm text-[#DC2626]">
              Verification is temporarily unavailable. Please contact support.
            </div>
          )}
          {params.error === 'onboard_failed' && (
            <div className="mb-6 rounded-lg bg-[#FEE2E2] p-4 text-sm text-[#DC2626]">
              Something went wrong during setup. Please try again or contact support.
            </div>
          )}
          <ol className="mb-8 space-y-6">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold" style={{ backgroundColor: 'var(--primary)', color: 'var(--white)' }}>1</span>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--black)' }}>Create your seller account</h3>
                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  We&apos;ll set up your account for secure payments.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold" style={{ backgroundColor: 'var(--gray-200)', color: 'var(--gray-600)' }}>2</span>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--black)' }}>Complete KYC verification</h3>
                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  Verify your identity to receive payouts. Required before publishing gigs.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold" style={{ backgroundColor: 'var(--gray-200)', color: 'var(--gray-600)' }}>3</span>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--black)' }}>Create your first gig</h3>
                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  Add packages, pricing, and start accepting orders.
                </p>
              </div>
            </li>
          </ol>
          <VerificationButton className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 py-4 text-base font-medium text-white transition-all hover:opacity-90">
            Continue to verification
          </VerificationButton>
        </div>
      </div>
    </div>
  );
}
