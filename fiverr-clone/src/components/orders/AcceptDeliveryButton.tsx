'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { GFButton } from '@/components/gigflow/design-system';

interface AcceptDeliveryButtonProps {
  orderId: string;
}

export function AcceptDeliveryButton({ orderId }: AcceptDeliveryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/accept-delivery`, {
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
      variant="brand"
      size="lg"
      onClick={handleAccept}
      disabled={loading}
      icon={<Check size={16} />}
      className="w-full"
    >
      {loading ? 'Completing...' : 'Accept Delivery'}
    </GFButton>
  );
}
