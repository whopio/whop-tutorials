'use client';

import { useState } from 'react';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui';
import { Check } from 'lucide-react';
import { OrderOptionsSlideOut } from './OrderOptionsSlideOut';

interface Pkg {
  id: string;
  tier: string;
  title: string;
  description: string;
  price_cents: number;
  delivery_days: number;
  revisions_included: number;
  includes: string[];
}

interface Extra {
  id: string;
  title: string;
  price_cents: number;
  active?: boolean;
}

interface GigPackageSidebarProps {
  gigId: string;
  gigTitle: string;
  packages: Pkg[];
  extras?: Extra[];
}

const TIER_ORDER = ['basic', 'standard', 'premium'];

export function GigPackageSidebar({ gigId, gigTitle, packages, extras = [] }: GigPackageSidebarProps) {
  const sorted = [...packages].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
  );
  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? '');
  const [slideOutOpen, setSlideOutOpen] = useState(false);
  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0];

  if (!selected) return null;

  const includes = (selected.includes as string[] || []).filter(Boolean);

  return (
    <>
      <div className="sticky top-24">
        <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--gray-200)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--gray-200)' }}>
            {sorted.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedId(pkg.id)}
                className="flex-1 py-4 text-sm font-medium transition-all"
                style={{
                  backgroundColor: selectedId === pkg.id ? 'var(--white)' : 'var(--gray-100)',
                  color: selectedId === pkg.id ? 'var(--black)' : 'var(--gray-600)',
                  borderBottom: selectedId === pkg.id ? '2px solid var(--primary)' : 'none',
                }}
              >
                {pkg.title}
              </button>
            ))}
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-baseline justify-between">
              <span className="text-3xl font-bold" style={{ color: 'var(--black)' }}>
                ${(selected.price_cents / 100).toFixed(0)}
              </span>
              <span className="text-sm" style={{ color: 'var(--gray-400)' }}>
                {selected.delivery_days} days delivery
              </span>
            </div>

            <p className="mb-6 text-sm" style={{ color: 'var(--gray-600)' }}>
              {selected.description || `${selected.title} package.`}
            </p>

            <ul className="mb-6 space-y-3">
              {includes.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm" style={{ color: 'var(--gray-600)' }}>
                  <Check size={16} style={{ color: 'var(--success)' }} />
                  {f}
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm" style={{ color: 'var(--gray-600)' }}>
                <Check size={16} style={{ color: 'var(--success)' }} />
                {selected.revisions_included} revisions
              </li>
            </ul>

            <Button
              variant="primary"
              className="w-full"
              size="lg"
              icon={<ChevronRight size={18} />}
              onClick={() => setSlideOutOpen(true)}
            >
              Continue
            </Button>

            <button
              type="button"
              className="mt-3 w-full rounded-full py-3 text-sm font-medium transition-all hover:bg-[var(--gray-100)]"
              style={{ color: 'var(--gray-600)' }}
            >
              Compare packages
            </button>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium transition-all hover:bg-[var(--gray-100)]"
          style={{ border: '1px solid var(--gray-200)', color: 'var(--gray-600)' }}
        >
          <MessageSquare size={18} />
          Contact Seller
        </button>
      </div>

      <OrderOptionsSlideOut
        isOpen={slideOutOpen}
        onClose={() => setSlideOutOpen(false)}
        gigId={gigId}
        gigTitle={gigTitle}
        pkg={selected}
        extras={extras}
      />
    </>
  );
}
