import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NavAccount } from '@/components/layout/NavAccount';
import { Footer } from '@/components/layout/Footer';
import { AccountWorkspace } from '@/components/account/AccountWorkspace';
import { C } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/server';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account');
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();
  const isSeller = !!seller;

  const { data: buyerOrders } = await supabase
    .from('orders')
    .select('id, status, created_at, gig_id, package_id, total_cents')
    .eq('buyer_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const gigIds = [...new Set((buyerOrders || []).map((o) => o.gig_id).filter(Boolean))];
  const pkgIds = [...new Set((buyerOrders || []).map((o) => o.package_id).filter(Boolean))];
  const { data: gigsData } = gigIds.length
    ? await supabase
        .from('gigs')
        .select('id, title, gallery, seller_user_id')
        .in('id', gigIds)
    : { data: [] };
  const { data: pkgsData } = pkgIds.length
    ? await supabase
        .from('gig_packages')
        .select('id, title, price_cents')
        .in('id', pkgIds)
    : { data: [] };
  const sellerIds = [...new Set((buyerOrders || []).map((o) => {
    const g = gigsData?.find((x) => x.id === (o as { gig_id?: string }).gig_id);
    return (g as { seller_user_id?: string } | undefined)?.seller_user_id;
  }).filter(Boolean))];
  const { data: sellerProfiles } = sellerIds.length
    ? await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', sellerIds)
    : { data: [] };

  const gigsMap = new Map((gigsData || []).map((g) => [g.id, g]));
  const pkgsMap = new Map((pkgsData || []).map((p) => [p.id, p]));
  const profilesMap = new Map((sellerProfiles || []).map((p) => [p.user_id, p]));

  const buyerOrdersFormatted = (buyerOrders || []).map((o) => {
    const gig = gigsMap.get(o.gig_id) as { title?: string; gallery?: Array<{ url?: string }>; seller_user_id?: string } | undefined;
    const pkg = pkgsMap.get(o.package_id);
    const gallery = gig?.gallery || [];
    const coverUrl = Array.isArray(gallery) ? gallery[0]?.url : null;
    const profile = gig?.seller_user_id ? profilesMap.get(gig.seller_user_id) : null;
    const totalCents = pkg?.price_cents ?? 0;
    return {
      id: o.id,
      gig: gig?.title || 'Order',
      seller: profile?.display_name || 'Seller',
      sellerAvatar: profile?.avatar_url,
      price: totalCents / 100,
      status: o.status,
      date: new Date(o.created_at).toLocaleDateString(),
      imageUrl: coverUrl || null,
      packageName: pkg?.title || 'Standard',
    };
  });

  let sellerOrdersFormatted: Array<{
    id: string;
    gig: string;
    buyer: string;
    buyerAvatar: string | null;
    price: number;
    status: string;
    date: string;
    dueDate: string;
  }> = [];
  let sellerStats: { totalEarnings: string; activeOrders: number; avgRating: string; responseRate: string } | null = null;

  if (isSeller) {
    const { data: sellerOrders } = await supabase
      .from('orders')
      .select('id, status, created_at, gig_id, package_id, buyer_user_id, due_at')
      .eq('seller_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const sellerGigIds = [...new Set((sellerOrders || []).map((o) => o.gig_id).filter(Boolean))];
    const { data: sellerGigs } = sellerGigIds.length
      ? await supabase
          .from('gigs')
          .select('id, title')
          .in('id', sellerGigIds)
      : { data: [] };
    const buyerIds = [...new Set((sellerOrders || []).map((o) => (o as { buyer_user_id?: string }).buyer_user_id).filter(Boolean))];
    const { data: buyerProfiles } = buyerIds.length
      ? await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', buyerIds)
      : { data: [] };
    const sellerGigsMap = new Map((sellerGigs || []).map((g) => [g.id, g]));
    const buyerProfilesMap = new Map((buyerProfiles || []).map((p) => [p.user_id, p]));

    const orderPkgIds = [...new Set((sellerOrders || []).map((o) => (o as { package_id?: string }).package_id).filter(Boolean))];
    const { data: orderPkgs } = orderPkgIds.length
      ? await supabase.from('gig_packages').select('id, price_cents').in('id', orderPkgIds)
      : { data: [] };
    const pkgPriceMap = new Map((orderPkgs || []).map((p) => [p.id, p.price_cents]));

    sellerOrdersFormatted = (sellerOrders || []).map((o) => {
      const gig = sellerGigsMap.get(o.gig_id);
      const buyer = (o as { buyer_user_id?: string }).buyer_user_id
        ? buyerProfilesMap.get((o as { buyer_user_id: string }).buyer_user_id)
        : null;
      const pkgPrice = (o as { package_id?: string }).package_id
        ? pkgPriceMap.get((o as { package_id: string }).package_id) ?? 0
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

    const activeStatuses = ['awaiting_requirements', 'in_progress', 'revision_requested'];
    const { count: activeCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_user_id', user.id)
      .in('status', activeStatuses);
    const { data: completedOrderIds } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_user_id', user.id)
      .eq('status', 'completed');
    const ids = (completedOrderIds || []).map((x) => x.id);
    const { data: payments } = ids.length
      ? await supabase
          .from('whop_payments')
          .select('amount_after_fees_cents')
          .in('order_id', ids)
      : { data: [] };
    const totalCents = (payments || []).reduce((s, o) => s + (o.amount_after_fees_cents ?? 0), 0);
    sellerStats = {
      totalEarnings: totalCents >= 1000 ? `$${(totalCents / 1000).toFixed(1)}K` : `$${(totalCents / 100).toFixed(0)}`,
      activeOrders: activeCount ?? 0,
      avgRating: '4.97',
      responseRate: 'N/A',
    };
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="flex-1">
        <AccountWorkspace
        buyerOrders={buyerOrdersFormatted}
        sellerOrders={sellerOrdersFormatted}
        sellerStats={sellerStats}
        isSeller={isSeller}
      />
      </div>
      <Footer />
    </div>
  );
}
