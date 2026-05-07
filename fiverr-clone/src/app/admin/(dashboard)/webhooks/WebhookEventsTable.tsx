'use client';

import { useState } from 'react';

interface WebhookEvent {
  id: string;
  webhook_id: string;
  type: string;
  company_id: string | null;
  received_at: string;
  payload?: unknown;
}

interface WebhookEventsTableProps {
  events: WebhookEvent[];
}

export function WebhookEventsTable({ events }: WebhookEventsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--white)' }}>
      {events.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
          No webhook events
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                  Webhook ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                  Received
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase" style={{ color: 'var(--gray-500)' }}>
                  Payload
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <>
                  <tr
                    key={ev.id}
                    className="cursor-pointer hover:bg-[var(--gray-50)]"
                    style={{ borderBottom: '1px solid var(--gray-100)' }}
                    onClick={() => toggleExpand(ev.id)}
                  >
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--black)' }}>
                      {ev.type}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs" style={{ color: 'var(--gray-600)' }}>
                      {ev.webhook_id}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--gray-600)' }}>
                      {ev.company_id ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--gray-500)' }}>
                      {new Date(ev.received_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="text-sm font-medium"
                        style={{ color: 'var(--primary)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(ev.id);
                        }}
                      >
                        {expandedId === ev.id ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === ev.id && (
                    <tr key={`${ev.id}-payload`} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td colSpan={5} className="px-6 py-4">
                        <pre
                          className="max-h-64 overflow-auto rounded-lg bg-[var(--gray-100)] p-4 text-xs"
                          style={{ color: 'var(--gray-700)' }}
                        >
                          {JSON.stringify(ev.payload ?? {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
