import { notFound } from 'next/navigation';
import { NavAccount } from '@/components/layout/NavAccount';
import { Footer } from '@/components/layout/Footer';
import { GigDetailClient } from '@/components/gig/GigDetailClient';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSellerLevel } from '@/lib/seller-level';

export default async function GigDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let gig = await supabase
    .from('gigs')
    .select(`
      id,
      slug,
      title,
      description,
      faq,
      gallery,
      status,
      seller_user_id,
      category_id,
      gig_packages(id, tier, title, description, price_cents, delivery_days, revisions_included, includes),
      gig_extras(id, title, price_cents, active),
      categories(slug, name)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!gig.data && user) {
    const ownerGig = await supabase
      .from('gigs')
      .select(`
        id,
        slug,
        title,
        description,
        faq,
        gallery,
        status,
        seller_user_id,
        category_id,
        gig_packages(id, tier, title, description, price_cents, delivery_days, revisions_included, includes),
        gig_extras(id, title, price_cents, active),
        categories(slug, name)
      `)
      .eq('slug', slug)
      .eq('seller_user_id', user.id)
      .single();
    if (ownerGig.data) gig = ownerGig;
  }

  if (!gig.data) notFound();
  const gigData = gig.data;

  const isNotLive = gigData.status !== 'published';
  const isOwner = user?.id === gigData.seller_user_id;

  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('display_name, username, avatar_url, bio')
    .eq('user_id', gigData.seller_user_id)
    .single();

  const admin = createAdminClient();
  const [
    { count: completedOrdersCount },
    { data: reviews },
    { count: ordersInQueueCount },
  ] = await Promise.all([
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_user_id', gigData.seller_user_id)
      .in('status', ['delivered', 'completed']),
    supabase
      .from('reviews')
      .select('id, rating, body, created_at, buyer_user_id')
      .eq('gig_id', gigData.id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_user_id', gigData.seller_user_id)
      .in('status', ['awaiting_requirements', 'in_progress', 'revision_requested']),
  ]);

  const { data: reviewsAll } = await supabase
    .from('reviews')
    .select('rating')
    .eq('gig_id', gigData.id);
  const reviewCount = reviewsAll?.length ?? 0;
  const avgRating =
    reviewCount > 0
      ? reviewsAll!.reduce((s, r) => s + r.rating, 0) / reviewCount
      : null;

  const buyerIds = [...new Set((reviews || []).map((r) => r.buyer_user_id).filter(Boolean))];
  const { data: buyerProfiles } = buyerIds.length
    ? await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', buyerIds)
    : { data: [] };
  const buyerMap = new Map((buyerProfiles || []).map((p) => [p.user_id, p]));

  const reviewsWithNames = (reviews || []).map((r) => ({
    ...r,
    profiles: r.buyer_user_id ? buyerMap.get(r.buyer_user_id) : null,
  }));

  const seller = sellerProfile;
  const completedCount = completedOrdersCount ?? 0;
  const sellerLevel = getSellerLevel(completedCount);
  const category = gigData.categories as { slug?: string; name?: string } | null;
  const rawPackages = (gigData.gig_packages || []) as Array<{
    id: string;
    tier: string;
    title: string;
    description: string;
    price_cents: number;
    delivery_days: number;
    revisions_included: number;
    includes?: unknown[];
  }>;
  const packages = rawPackages.map((p) => ({ ...p, includes: (p.includes ?? []) as string[] }));

  const extras = (gigData.gig_extras || []) as Array<{
    id: string;
    title: string;
    price_cents: number;
    active?: boolean;
  }>;

  const gallery = (gigData.gallery as Array<{ url: string; type: 'image' | 'video' }>) || [];

  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (reviewCount > 0 && reviewsAll) {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsAll.forEach((r) => {
      const n = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (n >= 1 && n <= 5) counts[n]++;
    });
    (Object.keys(counts) as Array<'1'|'2'|'3'|'4'|'5'>).forEach((k) => {
      const n = parseInt(k, 10) as 1|2|3|4|5;
      ratingBreakdown[n] = Math.round((counts[n] / reviewCount) * 100);
    });
  }

  const sellerBadgeVariant =
    sellerLevel.level === 'top_rated' ? 'dark' :
    sellerLevel.level === 'new' ? 'default' : 'success';

  const reviewsForClient = reviewsWithNames.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    displayName: (r.profiles as { display_name?: string } | null)?.display_name ?? null,
    avatarUrl: (r.profiles as { avatar_url?: string } | null)?.avatar_url ?? null,
  }));

  let totalEarnedFormatted = '$0';
  try {
    const { data: completedOrders } = await admin
      .from('orders')
      .select('id')
      .eq('seller_user_id', gigData.seller_user_id)
      .in('status', ['delivered', 'completed']);
    const orderIds = (completedOrders || []).map((o) => o.id);
    if (orderIds.length > 0) {
      const { data: payments } = await admin
        .from('whop_payments')
        .select('amount_after_fees_cents')
        .in('order_id', orderIds);
      const totalCents = (payments || []).reduce((s, p) => s + (p.amount_after_fees_cents ?? 0), 0);
      totalEarnedFormatted = totalCents >= 1000 ? `$${(totalCents / 1000).toFixed(0)}K` : `$${(totalCents / 100).toFixed(0)}`;
    }
  } catch {
    //
  }

  return (
    <>
      <NavAccount />
      <div className="pt-[72px] sm:pt-20">
      <GigDetailClient
        gigId={gigData.id}
        sellerUserId={gigData.seller_user_id}
        title={gigData.title}
        description={gigData.description || ''}
        status={gigData.status}
        categoryName={category?.name}
        categorySlug={category?.slug}
        sellerDisplayName={seller?.display_name || seller?.username || 'Seller'}
        sellerUsername={seller?.username}
        sellerAvatarUrl={seller?.avatar_url}
        sellerLevelLabel={sellerLevel.label}
        sellerLevelVariant={sellerBadgeVariant}
        avgRating={avgRating}
        reviewCount={reviewCount}
        ordersInQueue={ordersInQueueCount ?? 0}
        gallery={gallery}
        packages={packages}
        extras={extras}
        reviews={reviewsForClient}
        ratingBreakdown={ratingBreakdown}
        completedOrdersCount={completedCount}
        totalEarnedFormatted={totalEarnedFormatted}
        onTimePercent={99}
        sellerBio={(sellerProfile as { bio?: string } | null)?.bio ?? null}
        isNotLive={isNotLive}
        isOwner={!!isOwner}
        editHref={isNotLive && isOwner ? `/sell/gigs/${gigData.id}/edit` : undefined}
        faq={(gigData.faq || []) as Array<{ question?: string; answer?: string }>}
      />
      </div>
      <Footer />
    </>
  );
}
