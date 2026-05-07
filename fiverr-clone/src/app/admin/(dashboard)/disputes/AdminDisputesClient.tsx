'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui';

interface DisputeItem {
  dispute: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    reason: string | null;
    created_at: string;
  };
  sellerName: string;
  sellerEmail: string;
  companyId: string;
}

interface ResponseData {
  disputes: DisputeItem[];
  whopConfigured: boolean;
}

interface AdminDisputesClientProps {
  baseUrl?: string;
}

function statusVariant(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status.includes('won') || status.includes('closed')) return 'success';
  if (status.includes('lost') || status.includes('needs_response')) return 'error';
  if (status.includes('under_review')) return 'warning';
  return 'default';
}

export function AdminDisputesClient({ baseUrl }: AdminDisputesClientProps) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = baseUrl ? `${baseUrl}/api/admin/disputes` : '/api/admin/disputes';
    fetch(url, { credentials: 'include' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ disputes: [], whopConfigured: false }))
      .finally(() => setLoading(false));
  }, [baseUrl]);

  if (loading) {
    return (
      <p className="py-12 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
        Loading disputes...
      </p>
    );
  }

  if (!data?.whopConfigured) {
    return (
      <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--white)' }}>
        <p className="text-center text-sm" style={{ color: 'var(--gray-500)' }}>
          Whop is not configured. Set WHOP_API_KEY to view disputes.
        </p>
      </div>
    );
  }

  if (data.disputes.length === 0) {
    return (
      <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--white)' }}>
        <p className="text-center text-sm" style={{ color: 'var(--gray-500)' }}>
          No disputes
        </p>
      </div>
    );
  }

  const bySeller = new Map<string, DisputeItem[]>();
  for (const item of data.disputes) {
    const key = `${item.sellerName}|${item.sellerEmail}`;
    if (!bySeller.has(key)) bySeller.set(key, []);
    bySeller.get(key)!.push(item);
  }

  return (
    <div className="space-y-6">
      {Array.from(bySeller.entries()).map(([key, items]) => {
        const [sellerName, sellerEmail] = key.split('|');
        return (
          <div
            key={key}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--white)' }}
          >
            <div
              className="px-6 py-4 font-medium"
              style={{ borderBottom: '1px solid var(--gray-200)', color: 'var(--black)' }}
            >
              {sellerName} ({sellerEmail})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                      Dispute ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.dispute.id}
                      style={{ borderBottom: '1px solid var(--gray-100)' }}
                    >
                      <td className="px-6 py-3 font-mono text-sm" style={{ color: 'var(--gray-600)' }}>
                        {item.dispute.id}
                      </td>
                      <td className="px-6 py-3 font-medium" style={{ color: 'var(--black)' }}>
                        {item.dispute.currency.toUpperCase()} {item.dispute.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant(item.dispute.status)}>
                          {item.dispute.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm" style={{ color: 'var(--gray-600)' }}>
                        {item.dispute.reason ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-sm" style={{ color: 'var(--gray-500)' }}>
                        {new Date(item.dispute.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
