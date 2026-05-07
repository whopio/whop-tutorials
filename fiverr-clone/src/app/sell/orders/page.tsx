import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NavAccount } from '@/components/layout/NavAccount';
import { Footer } from '@/components/layout/Footer';
import { Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function SellerOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/sell/orders');
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    redirect('/sell/onboarding');
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, completed_at, gig_id, package_id')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const gigIds = [...new Set((orders || []).map((o) => o.gig_id).filter(Boolean))];
  const pkgIds = [...new Set((orders || []).map((o) => o.package_id).filter(Boolean))];
  const { data: gigsData } = gigIds.length
    ? await supabase.from('gigs').select('id, title, gallery').in('id', gigIds)
    : { data: [] };
  const { data: pkgsData } = pkgIds.length
    ? await supabase.from('gig_packages').select('id, price_cents').in('id', pkgIds)
    : { data: [] };
  const gigsMap = new Map((gigsData || []).map((g) => [g.id, g]));
  const pkgsMap = new Map((pkgsData || []).map((p) => [p.id, p]));

  const statusStyles: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'default' }> = {
    awaiting_requirements: { label: 'Awaiting Info', variant: 'primary' },
    in_progress: { label: 'In Progress', variant: 'primary' },
    delivered: { label: 'Delivered', variant: 'warning' },
    completed: { label: 'Completed', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    refunded: { label: 'Refunded', variant: 'error' },
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--gray-100)' }}>
      <NavAccount />
      <div className="flex-1 mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Seller Orders
          </h1>
          <Link href="/sell/dashboard" className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
            ← Back to Dashboard
          </Link>
        </div>

        <div className="space-y-4">
          {(orders || []).length === 0 ? (
            <div
              className="rounded-2xl p-12"
              style={{ backgroundColor: 'var(--white)' }}
            >
              <p className="mb-4" style={{ color: 'var(--gray-600)' }}>
                No orders yet.
              </p>
              <Link href="/sell/gigs">
                <Button variant="primary" size="sm">Manage Gigs</Button>
              </Link>
            </div>
          ) : (
            (orders || []).map((order) => {
              const gig = gigsMap.get(order.gig_id);
              const pkg = pkgsMap.get(order.package_id);
              const price = pkg?.price_cents ? (pkg.price_cents / 100).toFixed(0) : '0';
              const statusInfo = statusStyles[order.status] || {
                label: order.status,
                variant: 'default' as const,
              };
              const gallery = (gig as { gallery?: Array<{ url?: string }> } | undefined)?.gallery || [];
              const coverUrl = gallery[0]?.url;

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl p-6 transition-all hover:shadow-md"
                  style={{ backgroundColor: 'var(--white)' }}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--gray-200)]">
                        {coverUrl ? (
                          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: 'var(--gray-500)' }}>
                            —
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="mb-1 font-mono text-xs" style={{ color: 'var(--gray-400)' }}>
                          {order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <h3 className="font-semibold" style={{ color: 'var(--black)' }}>
                          {gig?.title || 'Order'}
                        </h3>
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                  <div
                    className="flex items-center justify-between border-t pt-4"
                    style={{ borderColor: 'var(--gray-100)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--gray-400)' }}>
                      Ordered: {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-semibold" style={{ color: 'var(--black)' }}>
                      ${price}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
