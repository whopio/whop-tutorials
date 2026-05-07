'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Clock,
  RefreshCw,
  MessageSquare,
  ArrowRight,
  Shield,
  Flag,
} from 'lucide-react';
import { C, GFButton } from '@/components/gigflow/design-system';
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

interface GigDetailSidebarProps {
  gigId: string;
  sellerUserId: string;
  gigTitle: string;
  packages: Pkg[];
  extras: Extra[];
  sellerDisplayName: string;
  sellerUsername?: string;
  sellerAvatarUrl?: string | null;
  sellerBio?: string | null;
  completedOrdersCount: number;
  totalEarnedFormatted: string;
  onTimePercent: number;
  isPublished: boolean;
  editHref?: string;
  isOwner?: boolean;
}

const TIER_ORDER = ['basic', 'standard', 'premium'];

export function GigDetailSidebar({
  gigId,
  sellerUserId,
  gigTitle,
  packages,
  extras,
  sellerDisplayName,
  sellerUsername,
  sellerAvatarUrl,
  sellerBio,
  completedOrdersCount,
  totalEarnedFormatted,
  onTimePercent,
  isPublished,
  editHref,
  isOwner,
}: GigDetailSidebarProps) {
  const sorted = [...packages].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
  );
  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? '');
  const [slideOutOpen, setSlideOutOpen] = useState(false);
  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0];

  if (!selected) return null;

  const includes = (selected.includes || []).filter(Boolean);

  return (
    <>
      <div className="sticky top-20">
        {isPublished && (
          <div
            className="rounded-2xl border overflow-hidden mb-4"
            style={{ borderColor: C.border }}
          >
            <div className="flex border-b" style={{ borderColor: C.border }}>
              {sorted.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedId(pkg.id)}
                  className="flex-1 py-3.5 text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: selectedId === pkg.id ? C.white : C.surface,
                    color: selectedId === pkg.id ? C.ink : C.muted,
                    borderBottom:
                      selectedId === pkg.id
                        ? `2px solid ${C.brand}`
                        : '2px solid transparent',
                  }}
                >
                  {pkg.title}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold" style={{ color: C.ink }}>
                  ${(selected.price_cents / 100).toFixed(0)}
                </span>
                <span
                  className="text-sm flex items-center gap-1"
                  style={{ color: C.muted }}
                >
                  <Clock size={13} />
                  {selected.delivery_days} days delivery
                </span>
              </div>
              <p className="text-sm mb-5" style={{ color: C.muted }}>
                {selected.description || `${selected.title} package.`}
              </p>

              <ul className="space-y-2.5 mb-5">
                {includes.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: C.muted }}
                  >
                    <Check size={14} className="flex-shrink-0" style={{ color: C.success }} />
                    {f}
                  </li>
                ))}
                <li
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: C.muted }}
                >
                  <RefreshCw
                    size={14}
                    className="flex-shrink-0"
                    style={{ color: C.success }}
                  />
                  {selected.revisions_included === -1
                    ? 'Unlimited revisions'
                    : `${selected.revisions_included} revisions`}
                </li>
              </ul>

              <GFButton
                variant="brand"
                size="lg"
                className="w-full mb-3"
                icon={<ArrowRight size={16} />}
                onClick={() => setSlideOutOpen(true)}
              >
                Continue — ${(selected.price_cents / 100).toFixed(0)}
              </GFButton>
              <Link
                href={`/messages?sellerId=${sellerUserId}&gigId=${gigId}&gigTitle=${encodeURIComponent(gigTitle)}`}
                className="block"
              >
                <GFButton
                  variant="outline"
                  size="md"
                  className="w-full"
                  iconLeft={<MessageSquare size={14} />}
                >
                  Contact seller
                </GFButton>
              </Link>
            </div>

            <div
              className="flex items-center justify-around p-4 border-t text-xs"
              style={{
                borderColor: C.border,
                backgroundColor: C.surface,
                color: C.muted,
              }}
            >
              <span className="flex items-center gap-1">
                <Shield size={12} style={{ color: C.success }} />
                Secure payment
              </span>
              <span className="flex items-center gap-1">
                <Check size={12} style={{ color: C.success }} />
                Money-back guarantee
              </span>
            </div>
          </div>
        )}

        {!isPublished && isOwner && editHref && (
          <div
            className="rounded-2xl border p-6 mb-4"
            style={{ borderColor: C.border }}
          >
            <p className="mb-4 text-sm" style={{ color: C.muted }}>
              Submit for review when ready.
            </p>
            <Link href={editHref}>
              <GFButton variant="brand" className="w-full" size="lg">
                Edit gig
              </GFButton>
            </Link>
          </div>
        )}

        {/* Seller Stats Card */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: C.border }}
        >
          <div className="flex items-center gap-3 mb-4">
            {sellerAvatarUrl ? (
              <img
                src={sellerAvatarUrl}
                alt={sellerDisplayName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg"
                style={{ backgroundColor: C.brandMuted, color: C.brand }}
              >
                {sellerDisplayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <Link
                href={`/s/${sellerUsername || 'seller'}`}
                className="font-semibold text-sm hover:underline"
                style={{ color: C.ink }}
              >
                {sellerDisplayName}
              </Link>
              <div className="text-xs" style={{ color: C.muted }}>
                {completedOrdersCount} orders
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            {[
              [String(completedOrdersCount), 'Orders'],
              [totalEarnedFormatted, 'Earned'],
              [`${onTimePercent}%`, 'On time'],
            ].map(([v, l], i) => (
              <div
                key={i}
                className="p-2 rounded-xl"
                style={{ backgroundColor: C.surface }}
              >
                <div className="font-bold text-sm" style={{ color: C.ink }}>
                  {v}
                </div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
          {sellerBio && (
            <p
              className="text-xs leading-relaxed"
              style={{ color: C.muted }}
            >
              {sellerBio}
            </p>
          )}
        </div>

        <button
          type="button"
          className="mt-3 w-full flex items-center justify-center gap-2 text-xs py-2 hover:opacity-70 transition"
          style={{ color: C.muted }}
        >
          <Flag size={12} />
          Report this gig
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
