import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui';
import { getFriendlyKycStatus } from '@/lib/kyc-status';

function maskCompanyId(id: string | null): string {
  if (!id) return '—';
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

export default async function AdminSellersPage() {
  const supabase = await createClient();

  const { data: sellers } = await supabase
    .from('seller_accounts')
    .select('id, user_id, whop_company_id, kyc_status, created_at')
    .order('created_at', { ascending: false });

  const userIds = (sellers ?? []).map((s) => s.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds)
    : { data: [] };

  const profilesMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, { display_name: p.display_name ?? '—', email: p.email ?? '—' }])
  );

  const kycVariant = (s: string) => {
    if (s === 'verified') return 'success';
    if (s === 'pending' || s === 'unstarted' || s === 'not_started') return 'warning';
    if (s === 'failed' || s === 'rejected') return 'error';
    return 'default';
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
          Sellers
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--gray-500)' }}>
          All registered sellers and their KYC status
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--white)' }}>
        {(sellers ?? []).length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
            No sellers yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    KYC Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Whop Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {(sellers ?? []).map((seller) => {
                  const p = profilesMap.get(seller.user_id);
                  return (
                    <tr
                      key={seller.id}
                      className="hover:bg-[var(--gray-50)]"
                      style={{ borderBottom: '1px solid var(--gray-100)' }}
                    >
                      <td className="px-6 py-4 font-medium" style={{ color: 'var(--black)' }}>
                        {p?.display_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--gray-600)' }}>
                        {p?.email ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={kycVariant(seller.kyc_status)}>
                          {getFriendlyKycStatus(seller.kyc_status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs" style={{ color: 'var(--gray-500)' }}>
                        {maskCompanyId(seller.whop_company_id)}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--gray-500)' }}>
                        {new Date(seller.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
