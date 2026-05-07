import Link from 'next/link';
import { NavAccount } from '@/components/layout/NavAccount';
import { Button } from '@/components/ui';
import { GigActionsDropdown } from '@/components/sell/GigActionsDropdown';
import { NoSellerAccount } from '@/components/sell/NoSellerAccount';
import { createClient } from '@/lib/supabase/server';
import { getWhopVerificationStatus } from '@/lib/whop-verification';

const STATUS_TABS = [
  { label: 'ACTIVE', value: 'published' },
  { label: 'PENDING APPROVAL', value: 'review' },
  { label: 'REQUIRES MODIFICATION', value: 'requires_modification' },
  { label: 'DRAFT', value: 'draft' },
  { label: 'DENIED', value: 'rejected' },
  { label: 'PAUSED', value: 'paused' },
] as const;

export default async function SellerGigsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { status: statusParam, error } = await searchParams;
  const activeStatus = statusParam || 'all';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--gray-100)' }}>
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Sign in required</h1>
          <Link href="/login?next=/sell/gigs">
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
    return <NoSellerAccount context="To manage gigs," error={error} />;
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
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--gray-100)' }}>
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Verification required</h1>
          <p className="mb-6 text-[var(--gray-600)]">Complete KYC verification before creating gigs.</p>
          <Link href="/sell/kyc">
            <Button variant="primary">Complete verification</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, slug, title, status, created_at, gallery, gig_packages(price_cents)')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false });

  const gigsWithPrice = (gigs || []).map((g) => {
    const packages = (g.gig_packages || []) as { price_cents: number }[];
    const minPrice = packages.length
      ? Math.min(...packages.map((p) => p.price_cents / 100))
      : null;
    return { ...g, minPrice };
  });

  const displayGigs =
    activeStatus === 'requires_modification'
      ? []
      : activeStatus === 'all'
        ? gigsWithPrice
        : gigsWithPrice.filter((g) => g.status === activeStatus);

  const statusCounts = STATUS_TABS.reduce(
    (acc, tab) => {
      const count =
        tab.value === 'requires_modification'
          ? 0
          : gigsWithPrice.filter((g) => g.status === tab.value).length;
      acc[tab.value] = count;
      return acc;
    },
    {} as Record<string, number>
  );

  const sectionTitle =
    activeStatus === 'all'
      ? 'ALL GIGS'
      : STATUS_TABS.find((t) => t.value === activeStatus)?.label ?? 'GIGS';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--white)' }}>
      <NavAccount />
      <div className="w-full px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Gigs
          </h1>
          <Link href="/sell/gigs/new" className="shrink-0">
            <Button variant="primary" className="w-full sm:w-auto">
              Create a new gig
            </Button>
          </Link>
        </div>

        {/* Status tabs */}
        <div className="mb-6 flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--gray-200)' }}>
          <Link
            href="/sell/gigs"
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeStatus === 'all'
                ? ''
                : 'border-transparent'
            }`}
            style={{
              borderColor: activeStatus === 'all' ? 'var(--primary)' : 'transparent',
              color: activeStatus === 'all' ? 'var(--primary)' : 'var(--gray-600)',
            }}
          >
            ALL
          </Link>
          {STATUS_TABS.map((tab) => {
            const count = statusCounts[tab.value] ?? 0;
            const isActive = activeStatus === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/sell/gigs?status=${tab.value}`}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? '' : 'border-transparent'
                }`}
                style={{
                  borderColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--gray-600)',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold uppercase" style={{ color: 'var(--gray-600)' }}>
            {sectionTitle}
          </h2>
          {displayGigs.length === 0 ? (
            <div className="rounded-xl border py-16 text-center" style={{ borderColor: 'var(--gray-200)' }}>
              <p className="mb-6 text-[var(--gray-600)]">
                {activeStatus === 'all'
                  ? "You haven't created any gigs yet."
                  : `No ${sectionTitle.toLowerCase()} gigs.`}
              </p>
              <Link href="/sell/gigs/new">
                <Button variant="primary">
                  {activeStatus === 'all' ? 'Create your first gig' : 'Create a new gig'}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayGigs.map((gig) => {
                const gallery = (gig.gallery || []) as Array<{ url: string; type?: string }>;
                const coverUrl = gallery[0]?.url;
                return (
                  <div
                    key={gig.id}
                    className="flex flex-col rounded-xl border p-4"
                    style={{ borderColor: 'var(--gray-200)', backgroundColor: 'var(--white)' }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <input type="checkbox" className="mt-1 rounded" aria-label="Select gig" />
                      <GigActionsDropdown gigId={gig.id} slug={gig.slug} status={gig.status} />
                    </div>
                    <Link href={`/g/${gig.slug}`} className="mb-3 flex gap-3 hover:opacity-80">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--gray-200)]">
                        {coverUrl ? (
                          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: 'var(--gray-500)' }}>
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-medium" style={{ color: 'var(--black)' }}>
                          {gig.title}
                        </h3>
                        <p className="mt-1 text-xs capitalize" style={{ color: 'var(--gray-500)' }}>
                          {gig.status}
                        </p>
                        {gig.minPrice != null && (
                          <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                            From ${gig.minPrice}
                          </p>
                        )}
                      </div>
                    </Link>
                    <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-3 text-xs" style={{ borderColor: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                      <div>
                        <span className="uppercase" style={{ color: 'var(--gray-500)' }}>Impressions</span>
                        <p className="font-medium">0</p>
                      </div>
                      <div>
                        <span className="uppercase" style={{ color: 'var(--gray-500)' }}>Clicks</span>
                        <p className="font-medium">0</p>
                      </div>
                      <div>
                        <span className="uppercase" style={{ color: 'var(--gray-500)' }}>Orders</span>
                        <p className="font-medium">0</p>
                      </div>
                      <div>
                        <span className="uppercase" style={{ color: 'var(--gray-500)' }}>Cancellations</span>
                        <p className="font-medium">0%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
