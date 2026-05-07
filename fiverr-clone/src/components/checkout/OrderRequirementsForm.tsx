'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, GFButton, GFInput, GFTextarea } from '@/components/gigflow/design-system';

interface Requirement {
  id: string;
  type: 'text' | 'textarea';
  question: string;
  required: boolean;
}

interface OrderRequirementsFormProps {
  orderId: string;
  requirements: Requirement[];
  gigTitle: string;
}

export function OrderRequirementsForm({
  orderId,
  requirements,
  gigTitle,
}: OrderRequirementsFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const canSubmit = requirements
    .filter((r) => r.required)
    .every((r) => (answers[r.id] || '').trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, attachments: [] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }
      router.refresh();
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <p className="text-sm" style={{ color: C.muted }}>
        {gigTitle}
      </p>
      <p className="text-sm" style={{ color: C.muted }}>
        Please provide the following so the seller can get started:
      </p>

      {requirements.map((req) => (
        <div key={req.id}>
          {req.type === 'textarea' ? (
            <GFTextarea
              label={req.question + (req.required ? ' *' : '')}
              value={answers[req.id] ?? ''}
              onChange={(e) => handleChange(req.id, e.target.value)}
              required={req.required}
              rows={4}
              placeholder="Your answer..."
            />
          ) : (
            <GFInput
              label={req.question + (req.required ? ' *' : '')}
              value={answers[req.id] ?? ''}
              onChange={(e) => handleChange(req.id, e.target.value)}
              placeholder="Your answer..."
              required={req.required}
            />
          )}
        </div>
      ))}

      {error && (
        <p className="text-sm" style={{ color: C.error }}>{error}</p>
      )}

      <GFButton
        type="submit"
        variant="brand"
        size="lg"
        disabled={!canSubmit || loading}
        loading={loading}
        className="w-full"
      >
        {loading ? 'Submitting…' : 'Submit requirements'}
      </GFButton>
    </form>
  );
}
