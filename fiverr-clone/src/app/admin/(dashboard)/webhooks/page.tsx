import { createClient } from '@/lib/supabase/server';
import { WebhookEventsTable } from './WebhookEventsTable';

export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('webhook_events')
    .select('id, webhook_id, type, company_id, received_at, payload')
    .order('received_at', { ascending: false })
    .limit(50);

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data: events } = await query;

  const { data: types } = await supabase
    .from('webhook_events')
    .select('type')
    .limit(1000);

  const uniqueTypes = [...new Set((types ?? []).map((t) => t.type).filter(Boolean))].sort();

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Webhooks
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--gray-500)' }}>
            Recent webhook events received
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/webhooks"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              !type || type === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--gray-100)]'
            }`}
          >
            All
          </a>
          {uniqueTypes.slice(0, 5).map((t) => (
            <a
              key={t}
              href={`/admin/webhooks?type=${encodeURIComponent(t)}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                type === t ? 'bg-[var(--primary)] text-white' : 'bg-[var(--gray-100)]'
              }`}
            >
              {t}
            </a>
          ))}
        </div>
      </div>

      <WebhookEventsTable events={events ?? []} />
    </>
  );
}
