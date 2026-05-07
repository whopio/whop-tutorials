'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { GFButton } from '@/components/gigflow/design-system';

interface RequestRevisionButtonProps {
  orderId: string;
}

export function RequestRevisionButton({ orderId }: RequestRevisionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/request-revision`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <GFButton
      variant="outline"
      size="lg"
      onClick={handleRequest}
      disabled={loading}
      iconLeft={<RefreshCw size={14} />}
      className="flex-1"
    >
      {loading ? 'Requesting...' : 'Request Revision'}
    </GFButton>
  );
}
