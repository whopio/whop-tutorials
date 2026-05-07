'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Heart,
  Share2,
  Flag,
  Check,
  Clock,
  RefreshCw,
  MessageSquare,
  Play,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { C, GFButton, GFBadge, StarRating, GFAvatar } from '@/components/gigflow/design-system';
import { cn } from '@/lib/utils';
import { GigCardHeartButton } from './GigCardHeartButton';
import { GigDetailSidebar } from './GigDetailSidebar';

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

interface Review {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface GigDetailClientProps {
  gigId: string;
  sellerUserId: string;
  title: string;
  description: string;
  status: string;
  categoryName?: string | null;
  categorySlug?: string | null;
  sellerDisplayName: string;
  sellerUsername?: string;
  sellerAvatarUrl?: string | null;
  sellerLevelLabel: string;
  sellerLevelVariant: 'default' | 'brand' | 'success' | 'dark';
  avgRating: number | null;
  reviewCount: number;
  ordersInQueue: number;
  gallery: Array<{ url: string; type: 'image' | 'video' }>;
  packages: Pkg[];
  extras: Extra[];
  reviews: Review[];
  ratingBreakdown?: { 5: number; 4: number; 3: number; 2: number; 1: number };
  completedOrdersCount: number;
  totalEarnedFormatted?: string;
  onTimePercent?: number;
  sellerBio?: string | null;
  isNotLive?: boolean;
  isOwner?: boolean;
  editHref?: string;
  faq?: Array<{ question?: string; answer?: string }>;
}

export function GigDetailClient(props: GigDetailClientProps) {
  const {
    gigId,
    sellerUserId,
    title,
    description,
    status,
    categoryName,
    categorySlug,
    sellerDisplayName,
    sellerUsername,
    sellerAvatarUrl,
    sellerLevelLabel,
    sellerLevelVariant,
    avgRating,
    reviewCount,
    ordersInQueue,
    gallery,
    packages,
    extras,
    reviews,
    ratingBreakdown = { 5: 92, 4: 6, 3: 2, 2: 0, 1: 0 },
    completedOrdersCount,
    totalEarnedFormatted = '$0',
    onTimePercent = 99,
    sellerBio,
    isNotLive,
    isOwner,
    editHref,
    faq = [],
  } = props;

  const [activeImage, setActiveImage] = useState(0);
  const galleryUrls = gallery
    .filter((g) => g.type === 'image')
    .map((g) => g.url);
  const hasGallery = galleryUrls.length > 0;
  const currentMedia = gallery[activeImage] || gallery[0];
  const firstImageUrl = gallery.find((g) => g.type === 'image')?.url;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: C.white }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full min-w-0">
        {isNotLive && isOwner && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-center text-sm font-medium"
            style={{
              backgroundColor:
                status === 'rejected' ? '#FEE2E2' :
                status === 'requires_modification' ? '#FEF3C7' : '#E0F2FE',
              color:
                status === 'rejected' ? '#991B1B' :
                status === 'requires_modification' ? '#92400E' : '#0369A1',
            }}
          >
            {status === 'draft' && 'Draft preview — only you can see this.'}
            {status === 'review' && 'Pending moderation.'}
            {status === 'requires_modification' && 'Changes requested — update and resubmit.'}
            {status === 'rejected' && 'This gig was not approved.'}
            {status === 'paused' && 'Paused — activate to make it live again.'}
            {editHref && (
              <Link href={editHref} className="ml-2 font-semibold underline">
                Edit gig
              </Link>
            )}
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: C.muted }}>
          <Link href="/search" className="hover:text-orange-500 transition">Marketplace</Link>
          <ChevronRight size={14} />
          {categorySlug && (
            <>
              <Link href={`/categories/${categorySlug}`} className="hover:text-orange-500 transition">
                {categoryName || 'Services'}
              </Link>
              <ChevronRight size={14} />
            </>
          )}
          <span style={{ color: C.ink }} className="truncate max-w-[200px]">{title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_380px] gap-12 min-w-0">
          {/* Main Content */}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-snug mb-6" style={{ color: C.ink }}>
              {title}
            </h1>

            {/* Seller row: avatar + info column + actions; on mobile stack with clear rows */}
            <div
              className="mb-6 p-4 rounded-2xl border flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4"
              style={{ borderColor: C.border, backgroundColor: C.surface }}
            >
              <div className="flex gap-3 min-w-0 flex-1">
                <Link href={`/s/${sellerUsername || 'seller'}`} className="shrink-0">
                  <GFAvatar src={sellerAvatarUrl ?? undefined} name={sellerDisplayName} size="lg" />
                </Link>
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/s/${sellerUsername || 'seller'}`}
                      className="font-semibold hover:underline"
                      style={{ color: C.ink }}
                    >
                      {sellerDisplayName}
                    </Link>
                    <GFBadge variant={sellerLevelVariant as 'default' | 'brand' | 'success' | 'dark'}>{sellerLevelLabel}</GFBadge>
                    <GFBadge variant="success" dot>Available</GFBadge>
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-2 text-sm"
                    style={{ color: C.muted }}
                  >
                    {reviewCount > 0 && avgRating ? (
                      <StarRating rating={avgRating} count={reviewCount} />
                    ) : (
                      <span>No reviews yet</span>
                    )}
                    <span aria-hidden className="opacity-50">·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {ordersInQueue} orders in queue
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <GigCardHeartButton gigId={gigId} inline />
                  <Link
                    href={`/messages?sellerId=${sellerUserId}&gigId=${gigId}&gigTitle=${encodeURIComponent(title)}`}
                  >
                    <GFButton variant="outline" size="sm" iconLeft={<MessageSquare size={14} />}>
                      Contact
                    </GFButton>
                  </Link>
                </div>
              </div>
              {/* Mobile: heart + Contact on their own row */}
              <div className="flex items-center gap-2 sm:hidden border-t pt-4" style={{ borderColor: C.border }}>
                <GigCardHeartButton gigId={gigId} inline />
                <Link
                  href={`/messages?sellerId=${sellerUserId}&gigId=${gigId}&gigTitle=${encodeURIComponent(title)}`}
                  className="flex-1 min-w-0"
                >
                  <GFButton variant="outline" size="sm" iconLeft={<MessageSquare size={14} />} className="w-full justify-center">
                    Contact
                  </GFButton>
                </Link>
              </div>
            </div>

            {/* Gallery */}
            <div
              className="rounded-2xl overflow-hidden mb-3 aspect-[16/9] relative border w-full min-w-0 max-w-full"
              style={{ borderColor: C.border, backgroundColor: C.surfaceAlt }}
            >
              {currentMedia?.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  className="w-full h-full max-w-full max-h-full object-cover"
                  controls
                  poster={firstImageUrl}
                  playsInline
                />
              ) : currentMedia?.url ? (
                <img src={currentMedia.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}>
                    <Play size={24} style={{ color: C.ink }} />
                  </div>
                </div>
              )}
              {currentMedia?.type === 'image' && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              )}
              {currentMedia?.type === 'image' && !hasGallery && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center opacity-80"
                    style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
                  >
                    <Play size={24} style={{ color: C.ink }} />
                  </div>
                </div>
              )}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <GigCardHeartButton gigId={gigId} inline />
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                  aria-label="Share"
                >
                  <Share2 size={16} style={{ color: C.ink }} />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {galleryUrls.length > 1 && (
              <div className="flex gap-2 mb-8 overflow-x-auto overflow-y-hidden pb-1 min-w-0 [scrollbar-width:thin]">
                {galleryUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all',
                      activeImage === i ? 'border-orange-500' : 'border-transparent hover:border-orange-300'
                    )}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <section className="mb-10">
              <h2 className="text-lg font-bold mb-4" style={{ color: C.ink }}>About this gig</h2>
              <div className="text-sm leading-relaxed space-y-3" style={{ color: C.muted }}>
                <div className="whitespace-pre-wrap">{description || 'No description provided.'}</div>
                {(() => {
                  const whatYouGet = faq.length > 0
                    ? faq.filter((f) => f.question?.trim()).map((f) => f.question!)
                    : [...new Set(packages.flatMap((p) => (p.includes || []).filter(Boolean)))];
                  if (whatYouGet.length === 0) return null;
                  return (
                    <>
                      <h3 className="font-semibold text-sm mt-4 mb-2" style={{ color: C.ink }}>What you get:</h3>
                      <ul className="space-y-2">
                        {whatYouGet.map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: C.success }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                })()}
              </div>
            </section>

            {/* Compare packages table */}
            {packages.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-bold mb-4" style={{ color: C.ink }}>Compare packages</h2>
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: C.surface }}>
                        <th className="text-left px-5 py-4 font-medium" style={{ color: C.muted }}>Feature</th>
                        {packages.map((pkg) => (
                          <th key={pkg.id} className="px-4 py-4 text-center font-semibold" style={{ color: C.brand }}>
                            {pkg.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.white }}>
                        <td className="px-5 py-3 font-medium text-xs" style={{ color: C.muted }}>Price</td>
                        {packages.map((pkg) => (
                          <td key={pkg.id} className="px-4 py-3 text-center text-xs font-semibold" style={{ color: C.brand }}>
                            ${(pkg.price_cents / 100).toFixed(0)}
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.surface }}>
                        <td className="px-5 py-3 font-medium text-xs" style={{ color: C.muted }}>Delivery</td>
                        {packages.map((pkg) => (
                          <td key={pkg.id} className="px-4 py-3 text-center text-xs" style={{ color: C.ink }}>
                            {pkg.delivery_days}d
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.white }}>
                        <td className="px-5 py-3 font-medium text-xs" style={{ color: C.muted }}>Revisions</td>
                        {packages.map((pkg) => (
                          <td key={pkg.id} className="px-4 py-3 text-center text-xs" style={{ color: C.ink }}>
                            {pkg.revisions_included === -1 ? '∞' : String(pkg.revisions_included)}
                          </td>
                        ))}
                      </tr>
                      {(() => {
                        const allIncludes = [...new Set(packages.flatMap((p) => (p.includes || []).filter(Boolean)))];
                        return allIncludes.slice(0, 6).map((inc, ri) => (
                          <tr key={ri} style={{ borderTop: `1px solid ${C.border}`, backgroundColor: ri % 2 === 0 ? C.white : C.surface }}>
                            <td className="px-5 py-3 font-medium text-xs" style={{ color: C.muted }}>{inc}</td>
                            {packages.map((pkg) => (
                              <td key={pkg.id} className="px-4 py-3 text-center text-xs" style={{ color: C.ink }}>
                                {(pkg.includes || []).includes(inc) ? '✓' : '—'}
                              </td>
                            ))}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Reviews */}
            {(reviews.length > 0 || reviewCount > 0) && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: C.ink }}>Reviews</h2>
                  {reviewCount > 0 && avgRating && (
                    <StarRating rating={avgRating} count={reviewCount} />
                  )}
                </div>
                {reviewCount > 0 && avgRating && (
                  <div
                    className="flex gap-6 mb-6 p-5 rounded-2xl border"
                    style={{ borderColor: C.border, backgroundColor: C.surface }}
                  >
                    <div className="text-center">
                      <div className="text-5xl font-bold" style={{ color: C.ink }}>{avgRating.toFixed(1)}</div>
                      <StarRating rating={Math.round(avgRating)} size={16} />
                      <div className="text-xs mt-1" style={{ color: C.muted }}>{reviewCount} reviews</div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 justify-center">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <div key={n} className="flex items-center gap-2">
                          <span className="text-xs w-4 text-right" style={{ color: C.muted }}>{n}</span>
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: C.border }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${ratingBreakdown[n as keyof typeof ratingBreakdown] ?? 0}%`,
                                backgroundColor: C.brand,
                              }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: C.muted }}>
                            {ratingBreakdown[n as keyof typeof ratingBreakdown] ?? 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {reviews.slice(0, 10).map((r) => (
                    <div key={r.id} className="p-5 rounded-2xl border" style={{ borderColor: C.border }}>
                      <div className="flex items-center gap-3 mb-3">
                        <GFAvatar src={r.avatarUrl ?? undefined} name={r.displayName ?? undefined} size="md" />
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: C.ink }}>
                            {r.displayName || 'Anonymous'}
                          </div>
                          <div className="text-xs font-mono" style={{ color: C.muted }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="ml-auto">
                          <StarRating rating={r.rating} size={13} />
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{r.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 min-w-0">
            <GigDetailSidebar
              gigId={gigId}
              sellerUserId={sellerUserId}
              gigTitle={title}
              packages={packages}
              extras={extras}
              sellerDisplayName={sellerDisplayName}
              sellerUsername={sellerUsername}
              sellerAvatarUrl={sellerAvatarUrl}
              sellerBio={sellerBio}
              completedOrdersCount={completedOrdersCount}
              totalEarnedFormatted={totalEarnedFormatted}
              onTimePercent={onTimePercent}
              isPublished={status === 'published'}
              editHref={editHref}
              isOwner={!!isOwner}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
