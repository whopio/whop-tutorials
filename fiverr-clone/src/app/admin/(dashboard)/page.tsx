import Link from 'next/link';
import { DollarSign, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

function formatCurrency(cents: number): string {
  if (cents >= 1_000_000) return `$${(cents / 100_000).toFixed(1)}M`;
  if (cents >= 1_000) return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

function formatShortId(id: string): string {
  return `ORD-${id.slice(0, 8)}`;
}

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { data: whopData },
    { count: sellerCount },
    { count: pendingGigCount },
    { data: recentOrdersData },
    { data: pendingGigsData },
  ] = await Promise.all([
    supabase
      .from('whop_payments')
      .select('total_cents, application_fee_cents')
      .in('status', ['succeeded', 'completed', 'paid', 'captured']),
    supabase
      .from('seller_accounts')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('gigs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'review'),
    supabase
      .from('orders')
      .select('id, status, created_at, buyer_user_id, seller_user_id, package_id')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('gigs')
      .select('id, title, created_at, seller_user_id')
      .eq('status', 'review')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const totalGmv = (whopData ?? []).reduce((s, p) => s + (p.total_cents ?? 0), 0);
  const platformRevenue = (whopData ?? []).reduce((s, p) => s + (p.application_fee_cents ?? 0), 0);

  const stats = [
    { label: 'Total GMV', value: formatCurrency(totalGmv), change: '-', icon: DollarSign },
    { label: 'Platform Revenue', value: formatCurrency(platformRevenue), change: '-', icon: TrendingUp },
    { label: 'Active Sellers', value: (sellerCount ?? 0).toLocaleString(), change: '-', icon: Users },
    { label: 'Pending Reviews', value: String(pendingGigCount ?? 0), change: '-', icon: AlertCircle },
  ];

  const orderIds = (recentOrdersData ?? []).map((o: { package_id: string }) => o.package_id);
  const { data: packagesData } = orderIds.length > 0
    ? await supabase.from('gig_packages').select('id, price_cents').in('id', orderIds)
    : { data: [] as { id: string; price_cents: number }[] };

  const userIds = [
    ...(recentOrdersData ?? []).flatMap((o: { buyer_user_id?: string; seller_user_id: string }) =>
      [o.buyer_user_id, o.seller_user_id].filter(Boolean)
    ),
    ...(pendingGigsData ?? []).map((g: { seller_user_id: string }) => g.seller_user_id),
  ].filter((id, i, arr) => id && arr.indexOf(id) === i) as string[];

  const { data: profilesData } = userIds.length > 0
    ? await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds)
    : { data: [] as { user_id: string; display_name: string | null }[] };

  const profilesMap = new Map((profilesData ?? []).map((p) => [p.user_id, p.display_name ?? '—']));
  const packagesMap = new Map((packagesData ?? []).map((p) => [p.id, p.price_cents]));

  const recentOrders = (recentOrdersData ?? []).map((o: { id: string; status: string; created_at: string; buyer_user_id?: string; seller_user_id: string; package_id: string }) => ({
    id: o.id,
    buyer: profilesMap.get(o.buyer_user_id ?? '') ?? '—',
    seller: profilesMap.get(o.seller_user_id) ?? '—',
    amount: (packagesMap.get(o.package_id) ?? 0) / 100,
    status: o.status,
  }));

  const pendingGigs = (pendingGigsData ?? []).map((g: { id: string; title: string; created_at: string; seller_user_id: string }) => ({
    id: g.id,
    title: g.title,
    seller: profilesMap.get(g.seller_user_id) ?? '—',
    submitted: relativeTime(new Date(g.created_at)),
  }));

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--gray-400)' }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
            <div className="mb-4 flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--gray-100)' }}
              >
                <stat.icon size={20} style={{ color: 'var(--primary)' }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
              {stat.value}
            </div>
            <div className="mt-1 text-sm" style={{ color: 'var(--gray-400)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: 'var(--black)' }}>
              Recent Orders
            </h2>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
                No orders yet
              </p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: '1px solid var(--gray-100)' }}
                >
                  <div>
                    <div className="font-mono text-sm" style={{ color: 'var(--gray-400)' }}>
                      {formatShortId(order.id)}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--black)' }}>
                      {order.buyer} → {order.seller}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: 'var(--black)' }}>
                      ${order.amount.toFixed(2)}
                    </div>
                    <Badge
                      variant={
                        order.status === 'disputed'
                          ? 'error'
                          : order.status === 'completed'
                          ? 'success'
                          : 'primary'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: 'var(--black)' }}>
              Pending Gig Reviews
            </h2>
            <Badge variant="warning">{pendingGigs.length} pending</Badge>
          </div>
          <div className="space-y-4">
            {pendingGigs.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
                No pending reviews
              </p>
            ) : (
              pendingGigs.map((gig) => (
                <div
                  key={gig.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: '1px solid var(--gray-100)' }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--black)' }}>
                      {gig.title}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--gray-400)' }}>
                      by {gig.seller} • {gig.submitted}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/gigs/${gig.id}`}>
                      <Button variant="ghost" size="sm">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
