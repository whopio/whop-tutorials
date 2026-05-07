import { redirect } from 'next/navigation';
import { NavAccount } from '@/components/layout/NavAccount';
import { NoSellerAccount } from '@/components/sell/NoSellerAccount';
import { C } from '@/lib/design-tokens';
import { SellPayoutsProvider } from '@/components/sell/SellPayoutsProvider';
import { SellerDashboardClient } from '@/components/sell/SellerDashboardClient';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSellerLevel } from '@/lib/seller-level';
import { getWhopOwnerUserId } from '@/lib/whop-owner';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/sell/dashboard');
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id, whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return <NoSellerAccount context="To view your dashboard," />;
  }

  // Backfill seller's whop_user_id in the background (don't block page load on Whop API)
  if (seller.whop_company_id && process.env.WHOP_API_KEY) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('whop_user_id')
      .eq('user_id', user.id)
      .single();
    if (!profileRow?.whop_user_id) {
      const userId = user.id;
      const companyId = seller.whop_company_id;
      const apiKey = process.env.WHOP_API_KEY;
      void (async () => {
        try {
          const whopOwnerId = await getWhopOwnerUserId(companyId, apiKey);
          if (whopOwnerId) {
            const admin = createAdminClient();
            await admin
              .from('profiles')
              .update({ whop_user_id: whopOwnerId, updated_at: new Date().toISOString() })
              .eq('user_id', userId);
          }
        } catch {
          // non-blocking; will retry on next visit or via balance API
        }
      })();
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .single();

  const now = new Date();
  const fiveMonthsAgo = new Date(now);
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

  const { data: completedOrders } = await supabase
    .from('orders')
    .select('id, gig_id, package_id, completed_at')
    .eq('seller_user_id', user.id)
    .eq('status', 'completed')
    .gte('completed_at', fiveMonthsAgo.toISOString());

  const completedIds = (completedOrders || []).map((o) => o.id);
  const orderPkgIds = [...new Set((completedOrders || []).map((o) => o.package_id).filter(Boolean))];
  const { data: payments } = completedIds.length
    ? await supabase
        .from('whop_payments')
        .select('order_id, amount_after_fees_cents, created_at')
        .in('order_id', completedIds)
    : { data: [] };

const pkgIds = orderPkgIds;
  const { data: pkgs } = pkgIds.length
    ? await supabase
        .from('gig_packages')
        .select('id, price_cents')
        .in('id', pkgIds)
    : { data: [] };
  const pkgMap = new Map((pkgs || []).map((p) => [p.id, p.price_cents]));

  const paymentByOrder = new Map(
    (payments || []).map((p) => [p.order_id, p.amount_after_fees_cents ?? 0])
  );

  const earningsByMonthMap = new Map<string, number>();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    earningsByMonthMap.set(key, 0);
  }

  for (const o of completedOrders || []) {
    const completedAt = (o as { completed_at?: string }).completed_at;
    if (!completedAt) continue;
    const dt = new Date(completedAt);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const cents = paymentByOrder.get(o.id) ?? pkgMap.get(o.package_id) ?? 0;
    earningsByMonthMap.set(key, (earningsByMonthMap.get(key) ?? 0) + cents);
  }

  const sortedKeys = Array.from(earningsByMonthMap.keys()).sort();
  const earningsByMonth = sortedKeys.map((key) => {
    const [, m] = key.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    const cents = earningsByMonthMap.get(key) ?? 0;
    return {
      month: MONTH_NAMES[monthIndex] ?? key,
      amount: cents / 100,
    };
  });

  const totalEarningsCents = (payments || []).reduce(
    (s, p) => s + (p.amount_after_fees_cents ?? 0),
    0
  );
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthEarnings = (earningsByMonthMap.get(thisMonthKey) ?? 0) / 100;

  // Active = orders where seller has work to do (exclude delivered - buyer is reviewing)
  const activeStatuses = ['awaiting_requirements', 'in_progress', 'revision_requested'];
  const { count: activeCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_user_id', user.id)
    .in('status', activeStatuses);

  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const { data: dueOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('seller_user_id', user.id)
    .in('status', activeStatuses)
    .gte('due_at', now.toISOString())
    .lte('due_at', weekFromNow.toISOString());
  const activeOrdersDueThisWeek = dueOrders?.length ?? 0;

  const completedCount = (completedOrders || []).length;
  const { count: totalCompleted } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_user_id', user.id)
    .eq('status', 'completed');
  const totalCompletedCount = totalCompleted ?? completedCount;

  const { data: sellerGigs } = await supabase
    .from('gigs')
    .select('id, slug, title, status, gallery, gig_packages(price_cents)')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false });

  const gigIds = (sellerGigs || []).map((g) => g.id);
  const { data: gigReviews } = gigIds.length
    ? await supabase.from('reviews').select('gig_id, rating').in('gig_id', gigIds)
    : { data: [] };
  const reviewsByGig = new Map<string, { count: number; sum: number }>();
  for (const r of gigReviews || []) {
    const cur = reviewsByGig.get(r.gig_id) ?? { count: 0, sum: 0 };
    cur.count++;
    cur.sum += r.rating;
    reviewsByGig.set(r.gig_id, cur);
  }

  const { data: orderCounts } = await supabase
    .from('orders')
    .select('gig_id')
    .eq('seller_user_id', user.id)
    .eq('status', 'completed');
  const ordersByGig = new Map<string, number>();
  for (const o of orderCounts || []) {
    ordersByGig.set(o.gig_id, (ordersByGig.get(o.gig_id) ?? 0) + 1);
  }

  const gigEarningsMap = new Map<string, number>();
  for (const o of completedOrders || []) {
    const cents = paymentByOrder.get(o.id) ?? pkgMap.get(o.package_id) ?? 0;
    const gigId = o.gig_id;
    if (gigId) {
      gigEarningsMap.set(gigId, (gigEarningsMap.get(gigId) ?? 0) + cents);
    }
  }

  const gigs = (sellerGigs || []).map((g) => {
    const gallery = (g.gallery || []) as Array<{ url?: string; type?: string }>;
    const firstImage = gallery.find((x) => x.type === 'image' || !x.type);
    const coverUrl = firstImage?.url || gallery[0]?.url || null;
    const packages = (g.gig_packages || []) as { price_cents: number }[];
    const minPrice = packages.length
      ? Math.min(...packages.map((p) => p.price_cents)) / 100
      : 0;
    const rev = reviewsByGig.get(g.id);
    const rating = rev?.count ? rev.sum / rev.count : 0;
    const reviews = rev?.count ?? 0;
    const orders = ordersByGig.get(g.id) ?? 0;
    const earnings = (gigEarningsMap.get(g.id) ?? 0) / 100;

    return {
      id: g.id,
      slug: g.slug,
      title: g.title,
      image: coverUrl,
      status: g.status === 'published' ? 'published' : g.status === 'paused' ? 'paused' : 'draft',
      orders,
      views: orders * 20,
      clicks: Math.floor(orders * 2),
      rating,
      reviews,
      price: minPrice,
      earnings,
    };
  });

  const sellerLevelInfo = getSellerLevel(totalCompletedCount);
  const nextLevelOrders =
    sellerLevelInfo.level === 'new'
      ? 1
      : sellerLevelInfo.level === 'level1'
        ? 5 - totalCompletedCount
        : sellerLevelInfo.level === 'level2'
          ? 20 - totalCompletedCount
          : 0;
  const nextLevelLabel =
    sellerLevelInfo.level === 'new'
      ? 'Level 1'
      : sellerLevelInfo.level === 'level1'
        ? 'Level 2'
        : 'Top Rated';
  const levelProgressPercent =
    sellerLevelInfo.level === 'new'
      ? (totalCompletedCount / 1) * 100
      : sellerLevelInfo.level === 'level1'
        ? (totalCompletedCount / 5) * 100
        : sellerLevelInfo.level === 'level2'
          ? (totalCompletedCount / 20) * 100
          : 100;

  const { data: allReviews } = await supabase
    .from('reviews')
    .select('rating')
    .in(
      'gig_id',
      (sellerGigs || []).map((g) => g.id)
    );
  const avgRating =
    (allReviews || []).length > 0
      ? (allReviews || []).reduce((s, r) => s + r.rating, 0) / (allReviews || []).length
      : null;

  // Buyer orders (orders user purchased)
  const { data: buyerOrders } = await supabase
    .from('orders')
    .select('id, status, created_at, gig_id, package_id, total_cents')
    .eq('buyer_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const buyerGigIds = [...new Set((buyerOrders || []).map((o) => o.gig_id).filter(Boolean))];
  const buyerPkgIds = [...new Set((buyerOrders || []).map((o) => o.package_id).filter(Boolean))];
  const { data: buyerGigsData } = buyerGigIds.length
    ? await supabase.from('gigs').select('id, title, gallery, seller_user_id').in('id', buyerGigIds)
    : { data: [] };
  const { data: buyerPkgsData } = buyerPkgIds.length
    ? await supabase.from('gig_packages').select('id, title, price_cents').in('id', buyerPkgIds)
    : { data: [] };
  const buyerSellerIds = [...new Set((buyerOrders || []).map((o) => {
    const g = buyerGigsData?.find((x) => x.id === (o as { gig_id?: string }).gig_id);
    return (g as { seller_user_id?: string })?.seller_user_id;
  }).filter(Boolean))];
  const { data: buyerSellerProfiles } = buyerSellerIds.length
    ? await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', buyerSellerIds)
    : { data: [] };
  const buyerGigsMap = new Map((buyerGigsData || []).map((g) => [g.id, g]));
  const buyerPkgsMap = new Map((buyerPkgsData || []).map((p) => [p.id, p]));
  const buyerProfilesMap = new Map((buyerSellerProfiles || []).map((p) => [p.user_id, p]));
  const buyerOrdersFormatted = (buyerOrders || []).map((o) => {
    const gig = buyerGigsMap.get(o.gig_id) as { title?: string; gallery?: Array<{ url?: string }>; seller_user_id?: string } | undefined;
    const pkg = buyerPkgsMap.get(o.package_id);
    const gallery = gig?.gallery || [];
    const coverUrl = Array.isArray(gallery) ? gallery[0]?.url : null;
    const profile = gig?.seller_user_id ? buyerProfilesMap.get(gig.seller_user_id) : null;
    const totalCents = pkg?.price_cents ?? 0;
    return {
      id: o.id,
      gig: gig?.title || 'Order',
      seller: profile?.display_name || 'Seller',
      sellerAvatar: profile?.avatar_url ?? null,
      price: totalCents / 100,
      status: o.status,
      date: new Date(o.created_at).toLocaleDateString(),
      imageUrl: coverUrl || null,
      packageName: pkg?.title || 'Standard',
    };
  });

  // Seller orders (orders where user is the seller)
  const { data: sellerOrders } = await supabase
    .from('orders')
    .select('id, status, created_at, gig_id, package_id, buyer_user_id, due_at')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const sellerOrderGigIds = [...new Set((sellerOrders || []).map((o) => o.gig_id).filter(Boolean))];
  const { data: sellerOrderGigs } = sellerOrderGigIds.length
    ? await supabase.from('gigs').select('id, title').in('id', sellerOrderGigIds)
    : { data: [] };
  const sellerOrderBuyerIds = [...new Set((sellerOrders || []).map((o) => (o as { buyer_user_id?: string }).buyer_user_id).filter(Boolean))];
  const { data: sellerOrderBuyerProfiles } = sellerOrderBuyerIds.length
    ? await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', sellerOrderBuyerIds)
    : { data: [] };
  const sellerOrderPkgIds = [...new Set((sellerOrders || []).map((o) => (o as { package_id?: string }).package_id).filter(Boolean))];
  const { data: sellerOrderPkgs } = sellerOrderPkgIds.length
    ? await supabase.from('gig_packages').select('id, price_cents').in('id', sellerOrderPkgIds)
    : { data: [] };
  const sellerOrderGigsMap = new Map((sellerOrderGigs || []).map((g) => [g.id, g]));
  const sellerOrderBuyerMap = new Map((sellerOrderBuyerProfiles || []).map((p) => [p.user_id, p]));
  const sellerOrderPkgMap = new Map((sellerOrderPkgs || []).map((p) => [p.id, p.price_cents]));
  const sellerOrdersFormatted = (sellerOrders || []).map((o) => {
    const gig = sellerOrderGigsMap.get(o.gig_id);
    const buyer = (o as { buyer_user_id?: string }).buyer_user_id
      ? sellerOrderBuyerMap.get((o as { buyer_user_id: string }).buyer_user_id)
      : null;
    const pkgPrice = (o as { package_id?: string }).package_id
      ? sellerOrderPkgMap.get((o as { package_id: string }).package_id) ?? 0
      : 0;
    const dueAt = (o as { due_at?: string }).due_at;
    const dueDate = dueAt ? new Date(dueAt).toLocaleDateString() : '-';
    return {
      id: o.id,
      gig: gig?.title || 'Order',
      buyer: buyer?.display_name || 'Buyer',
      buyerAvatar: buyer?.avatar_url ?? null,
      price: pkgPrice / 100,
      status: o.status,
      date: new Date(o.created_at).toLocaleDateString(),
      dueDate,
    };
  });

  return (
    <SellPayoutsProvider>
    <SellerDashboardClient
      thisMonthEarnings={thisMonthEarnings}
      activeOrders={activeCount ?? 0}
      activeOrdersDueThisWeek={activeOrdersDueThisWeek}
      avgRating={avgRating}
      reviewsCount={(allReviews || []).length}
      responseRate="N/A"
      earningsByMonth={earningsByMonth.length > 0 ? earningsByMonth : Array.from({ length: 5 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (4 - i));
        return { month: MONTH_NAMES[d.getMonth()], amount: 0 };
      })}
      totalEarnings={totalEarningsCents}
      gigs={gigs}
      sellerLevel={sellerLevelInfo.label}
      nextLevelLabel={nextLevelLabel}
      nextLevelOrders={Math.max(0, nextLevelOrders)}
      levelProgressPercent={Math.min(100, levelProgressPercent)}
      profileUsername={profile?.username ?? null}
      buyerOrders={buyerOrdersFormatted}
      sellerOrders={sellerOrdersFormatted}
    />
    </SellPayoutsProvider>
  );
}
