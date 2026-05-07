'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface GigCardHeartButtonProps {
  gigId: string;
  inline?: boolean;
}

export function GigCardHeartButton({ gigId, inline }: GigCardHeartButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/favorites/check?gigId=${gigId}`)
      .then((r) => r.json())
      .then((data) => setFavorited(data.favorited))
      .catch(() => {});
  }, [gigId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gigId }),
      });
      const data = await res.json();
      if (res.ok) setFavorited(data.favorited);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={`rounded-full p-2 transition-all ${
        inline ? 'bg-[var(--gray-100)] hover:bg-[var(--gray-200)]' : 'absolute right-4 top-4 bg-white/80 backdrop-blur-sm hover:bg-white'
      }`}
      onClick={handleClick}
      disabled={loading}
      aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
    >
      <Heart
        size={18}
        className={favorited ? 'fill-red-500 text-red-500' : 'text-[var(--gray-600)]'}
      />
    </button>
  );
}
