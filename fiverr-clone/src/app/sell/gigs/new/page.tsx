import Link from 'next/link';
import { NavAccount } from '@/components/layout/NavAccount';
import { GigCreateForm } from '@/components/sell/GigCreateForm';
import { NoSellerAccount } from '@/components/sell/NoSellerAccount';
import { C } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/server';
import { getWhopVerificationStatus } from '@/lib/whop-verification';

export default async function NewGigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: C.surface }}>
        <Link
          href="/login?next=/sell/gigs/new"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:shadow-md"
          style={{ background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})` }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('kyc_status, whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return <NoSellerAccount context="To create a gig," />;
  }

  let isVerified = seller.kyc_status === 'verified';
  if (seller.whop_company_id && process.env.WHOP_API_KEY) {
    const { verified } = await getWhopVerificationStatus(
      seller.whop_company_id,
      process.env.WHOP_API_KEY
    );
    if (verified) isVerified = true;
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: C.surface }}>
        <div className="text-center">
          <p className="mb-4 text-sm" style={{ color: C.muted }}>Complete verification first.</p>
          <Link
            href="/sell/kyc"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:shadow-md"
            style={{ background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})` }}
          >
            Complete verification
          </Link>
        </div>
      </div>
    );
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm mb-1" style={{ color: C.muted }}>
              <Link href="/sell/gigs" className="hover:opacity-70 transition">My Gigs</Link>
              <span>/</span>
              <span style={{ color: C.ink }}>Create New Gig</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: C.ink }}>Create a gig</h1>
          </div>
        </div>
        <GigCreateForm categories={categories || []} />
      </div>
    </div>
  );
}
