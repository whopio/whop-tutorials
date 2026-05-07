'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';

interface OrderDeliveryFormProps {
  orderId: string;
}

export function OrderDeliveryForm({ orderId }: OrderDeliveryFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<Array<{ url: string; name: string }>>([{ url: '', name: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validItems = items
    .map((i) => ({ url: i.url.trim(), name: i.name.trim() }))
    .filter((i) => i.url);

  const canSubmit = message.trim().length > 0 || validItems.length > 0;

  const addItem = () => setItems((prev) => [...prev, { url: '', name: '' }]);
  const updateItem = (idx: number, field: 'url' | 'name', value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim() || undefined,
          items: validItems.map((i) => ({ url: i.url, name: i.name || undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deliver');
      router.refresh();
      setMessage('');
      setItems([{ url: '', name: '' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--black)' }}>
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Describe what you delivered..."
          className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          style={{ borderColor: 'var(--gray-200)', color: 'var(--black)' }}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--black)' }}>
          Links / files
        </label>
        <p className="mb-2 text-xs" style={{ color: 'var(--gray-500)' }}>
          Add URLs to deliverables (e.g. Google Drive, Dropbox, or direct links)
        </p>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder="https://..."
                value={item.url}
                onChange={(e) => updateItem(idx, 'url', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Name (optional)"
                value={item.name}
                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                className="w-32"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-sm"
                style={{ color: 'var(--gray-500)' }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-sm font-medium"
            style={{ color: 'var(--primary)' }}
          >
            + Add link
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" variant="primary" size="sm" disabled={!canSubmit || loading}>
        {loading ? 'Delivering...' : 'Deliver'}
      </Button>
    </form>
  );
}
