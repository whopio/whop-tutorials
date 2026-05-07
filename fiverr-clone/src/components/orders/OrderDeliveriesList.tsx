import { C } from '@/lib/design-tokens';

interface Delivery {
  id: string;
  delivered_at: string;
  message: string | null;
  items: Array<{ url?: string; name?: string }>;
}

interface OrderDeliveriesListProps {
  deliveries: Delivery[];
}

export function OrderDeliveriesList({ deliveries }: OrderDeliveriesListProps) {
  if (deliveries.length === 0) return null;

  return (
    <div className="space-y-4 border-t pt-6" style={{ borderColor: C.border }}>
      <h2 className="font-semibold text-sm" style={{ color: C.ink }}>
        Deliveries
      </h2>
      <ul className="space-y-4">
        {deliveries.map((d) => (
          <li
            key={d.id}
            className="rounded-xl border p-4"
            style={{ backgroundColor: C.surface, borderColor: C.border }}
          >
            <p className="text-xs mb-2" style={{ color: C.muted }}>
              {new Date(d.delivered_at).toLocaleString()}
            </p>
            {d.message && (
              <p className="mb-2 text-sm whitespace-pre-wrap" style={{ color: C.ink }}>
                {d.message}
              </p>
            )}
            {Array.isArray(d.items) && d.items.length > 0 && (
              <ul className="list-disc list-inside space-y-1">
                {d.items.map((item, i) => {
                  const rawUrl = item.url?.trim();
                  const href = rawUrl
                    ? rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
                      ? rawUrl
                      : `https://${rawUrl}`
                    : null;
                  const label = item.name || item.url || 'Link';
                  return (
                    <li key={i}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline"
                          style={{ color: C.brand }}
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="text-sm" style={{ color: C.muted }}>
                          {label || 'Invalid link'}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
