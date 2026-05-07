import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui';

const PAGE_SIZE = 20;

function formatShortId(id: string): string {
  return `ORD-${id.slice(0, 8)}`;
}

function statusVariant(status: string): 'success' | 'primary' | 'error' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'disputed') return 'error';
  if (['in_progress', 'delivered', 'awaiting_requirements', 'revision_requested'].includes(status))
    return 'primary';
  return 'default';
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page = '1', status } = await searchParams;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from('orders')
    .select('id, status, created_at, buyer_user_id, seller_user_id, package_id', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: orders, count } = await query;

  const orderList = orders ?? [];
  const packageIds = orderList.map((o) => o.package_id);
  const userIds = [
    ...orderList.flatMap((o) => [o.buyer_user_id, o.seller_user_id].filter(Boolean)),
  ].filter((id, i, arr) => id && arr.indexOf(id) === i) as string[];

  const [{ data: packages }, { data: profiles }] = await Promise.all([
    packageIds.length > 0
      ? supabase.from('gig_packages').select('id, price_cents').in('id', packageIds)
      : Promise.resolve({ data: [] as { id: string; price_cents: number }[] }),
    userIds.length > 0
      ? supabase.from('profiles').select('user_id, display_name').in('user_id', userIds)
      : Promise.resolve({ data: [] as { user_id: string; display_name: string | null }[] }),
  ]);

  const packagesMap = new Map((packages ?? []).map((p) => [p.id, p.price_cents]));
  const profilesMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name ?? '—']));

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
          Orders
        </h1>
        <div className="flex gap-2">
          <Link
            href="/admin/orders"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              !status || status === 'all'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--gray-100)]'
            }`}
          >
            All
          </Link>
          <Link
            href="/admin/orders?status=completed"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              status === 'completed' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--gray-100)]'
            }`}
          >
            Completed
          </Link>
          <Link
            href="/admin/orders?status=disputed"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              status === 'disputed' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--gray-100)]'
            }`}
          >
            Disputed
          </Link>
        </div>
      </div>

      <div className="rounded-2xl" style={{ backgroundColor: 'var(--white)' }}>
        {orderList.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
            No orders
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Buyer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Seller
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderList.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[var(--gray-50)]"
                    style={{ borderBottom: '1px solid var(--gray-100)' }}
                  >
                    <td className="px-6 py-4 font-mono text-sm" style={{ color: 'var(--gray-600)' }}>
                      {formatShortId(order.id)}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--black)' }}>
                      {profilesMap.get(order.buyer_user_id ?? '') ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--black)' }}>
                      {profilesMap.get(order.seller_user_id) ?? '—'}
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--black)' }}>
                      ${((packagesMap.get(order.package_id) ?? 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--gray-500)' }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm font-medium"
                        style={{ color: 'var(--primary)' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--gray-100)' }}>
            {pageNum > 1 && (
              <Link
                href={`/admin/orders?page=${pageNum - 1}${status && status !== 'all' ? `&status=${status}` : ''}`}
                className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[var(--gray-100)]"
              >
                Previous
              </Link>
            )}
            <span className="text-sm" style={{ color: 'var(--gray-500)' }}>
              Page {pageNum} of {totalPages}
            </span>
            {pageNum < totalPages && (
              <Link
                href={`/admin/orders?page=${pageNum + 1}${status && status !== 'all' ? `&status=${status}` : ''}`}
                className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[var(--gray-100)]"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
