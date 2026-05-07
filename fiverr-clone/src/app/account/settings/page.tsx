import { redirect } from 'next/navigation';
import { NavAccount } from '@/components/layout/NavAccount';
import { ProfileSettingsClient, type ProfilePortfolioItem } from '@/components/profile/ProfileSettingsClient';
import { createClient } from '@/lib/supabase/server';

function toPortfolioItems(raw: unknown): ProfilePortfolioItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfilePortfolioItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const id = String(o.id || '').trim();
    const image_url = String(o.image_url || '').trim();
    if (!id || !image_url) continue;
    const title = String(o.title || '').trim();
    const url = o.url != null ? String(o.url).trim() : '';
    out.push(url ? { id, title, image_url, url } : { id, title, image_url });
  }
  return out;
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account/settings');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'display_name, username, avatar_url, banner_url, bio, skills, whop_user_id, location, website, tagline, portfolio'
    )
    .eq('user_id', user.id)
    .single();

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();
  const isSeller = !!seller;

  let ordersDone = 0;
  let avgRating: number | null = null;
  let totalEarned = '$0';
  let onTimePercent = 100;
  let reviewsCount = 0;
  let gigCount = 0;

  if (isSeller) {
    const [{ count: completedCount }, { data: sellerGigs }, { data: completedOrderIds }] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('seller_user_id', user.id)
        .eq('status', 'completed'),
      supabase
        .from('gigs')
        .select('id')
        .eq('seller_user_id', user.id),
      supabase
        .from('orders')
        .select('id')
        .eq('seller_user_id', user.id)
        .eq('status', 'completed'),
    ]);

    ordersDone = completedCount ?? 0;
    gigCount = sellerGigs?.length ?? 0;

    const ids = (completedOrderIds || []).map((o) => o.id);
    const { data: payments } = ids.length
      ? await supabase
          .from('whop_payments')
          .select('amount_after_fees_cents')
          .in('order_id', ids)
      : { data: [] };
    const totalCents = (payments || []).reduce((s, o) => s + (o.amount_after_fees_cents ?? 0), 0);
    totalEarned = totalCents >= 1000 ? `$${(totalCents / 1000).toFixed(1)}K` : `$${(totalCents / 100).toFixed(0)}`;

    const gigIds = (sellerGigs || []).map((g) => g.id);
    const { data: reviews } = gigIds.length
      ? await supabase
          .from('reviews')
          .select('rating')
          .in('gig_id', gigIds)
      : { data: [] };
    reviewsCount = reviews?.length ?? 0;
    avgRating =
      reviewsCount > 0
        ? reviews!.reduce((s, r) => s + r.rating, 0) / reviewsCount
        : null;
  }

  return (
    <div className="min-h-screen">
      <NavAccount />
      <ProfileSettingsClient
        displayName={profile?.display_name || ''}
        username={profile?.username || ''}
        bio={profile?.bio ?? ''}
        skills={Array.isArray(profile?.skills) ? profile.skills : []}
        location={typeof profile?.location === 'string' ? profile.location : ''}
        website={typeof profile?.website === 'string' ? profile.website : ''}
        tagline={typeof profile?.tagline === 'string' ? profile.tagline : ''}
        portfolio={toPortfolioItems(profile?.portfolio)}
        avatarUrl={profile?.avatar_url ?? null}
        bannerUrl={profile?.banner_url ?? null}
        ordersDone={ordersDone}
        avgRating={avgRating}
        totalEarned={totalEarned}
        onTimePercent={onTimePercent}
        isSeller={isSeller}
        reviewsCount={reviewsCount}
        gigCount={gigCount}
        whopLinked={!!profile?.whop_user_id}
      />
    </div>
  );
}
