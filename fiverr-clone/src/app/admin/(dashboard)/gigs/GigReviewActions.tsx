'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

interface GigReviewActionsProps {
  gigId: string;
}

export function GigReviewActions({ gigId }: GigReviewActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setLoading('approve');
    try {
      const res = await fetch(`/api/admin/gigs/${gigId}/approve`, { method: 'POST' });
      if (res.ok) router.push('/admin/gigs');
      else router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      const res = await fetch(`/api/admin/gigs/${gigId}/reject`, { method: 'POST' });
      if (res.ok) router.push('/admin/gigs');
      else router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={handleApprove}
        disabled={loading !== null}
      >
        {loading === 'approve' ? 'Approving...' : 'Approve'}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleReject}
        disabled={loading !== null}
      >
        {loading === 'reject' ? 'Rejecting...' : 'Reject'}
      </Button>
    </>
  );
}
