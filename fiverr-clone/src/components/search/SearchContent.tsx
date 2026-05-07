'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, ChevronDown, Clock, Star } from 'lucide-react';
import { C, GFButton, GFCard, GFBadge, StarRating, GFAvatar } from '@/components/gigflow/design-system';
import { GigCardHeartButton } from '@/components/gig/GigCardHeartButton';

const sortOptions = [
  { value: '', label: 'Best Match' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'top_rated', label: 'Top Rated' },
];

interface GigWithMeta {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  sellerName: string;
  sellerAvatarUrl: string | null;
  sellerDisplayName: string;
  minPrice: number;
  deliveryDays: number;
  reviewCount: number;
  avgRating: number | null;
  badge: string | null;
}

interface Category {
  slug: string;
  name: string;
}

interface SearchContentProps {
  gigs: GigWithMeta[];
  categories: Category[];
  categorySlug: string | null;
  sort: string | undefined;
  q: string | undefined;
  budget?: string | null;
  delivery?: string | null;
  minRating?: string | null;
}

const BUDGET_OPTIONS = [
  { value: '', label: 'Any budget' },
  { value: 'under50', label: 'Under $50' },
  { value: '50-100', label: '$50–$100' },
  { value: '100-500', label: '$100–$500' },
  { value: '500plus', label: '$500+' },
] as const;

const DELIVERY_OPTIONS = [
  { value: 'express', label: 'Express (24h)' },
  { value: '3', label: 'Up to 3 days' },
  { value: '7', label: 'Up to 7 days' },
  { value: 'any', label: 'Any' },
] as const;

const RATING_OPTIONS = [5, 4.5, 4, 3] as const;

export function SearchContent({ gigs, categories, categorySlug, sort, q, budget, delivery, minRating }: SearchContentProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const router = useRouter();
  const baseUrl = '/search';
  const buildParams = () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (categorySlug && categorySlug !== 'All') p.set('category', categorySlug);
    if (sort) p.set('sort', sort);
    if (budget) p.set('budget', budget);
    if (delivery && delivery !== 'any') p.set('delivery', delivery);
    if (minRating) p.set('min_rating', minRating);
    return p;
  };

  const handleSortChange = (value: string) => {
    const p = buildParams();
    if (value) p.set('sort', value);
    else p.delete('sort');
    router.push(`${baseUrl}?${p.toString()}`);
  };

  const handleFilter = (key: 'budget' | 'delivery' | 'min_rating', value: string) => {
    const p = buildParams();
    if (value && value !== 'any') p.set(key, value);
    else p.delete(key);
    router.push(`${baseUrl}?${p.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-4 pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.ink }}>
          {categorySlug && categorySlug.toLowerCase() !== 'all'
            ? categories.find((c) => c.slug === categorySlug.toLowerCase())?.name || categorySlug
            : 'All Services'}
        </h1>
        <p className="text-sm mt-1 font-mono" style={{ color: C.muted }}>
          {gigs.length.toLocaleString()} services available
        </p>
      </div>

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={(() => { const p = buildParams(); p.delete('category'); return `${baseUrl}?${p.toString()}`; })()}
            className="px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap"
            style={{
              backgroundColor: !categorySlug || categorySlug.toLowerCase() === 'all' ? C.ink : C.white,
              color: !categorySlug || categorySlug.toLowerCase() === 'all' ? C.white : C.muted,
              borderColor: !categorySlug || categorySlug.toLowerCase() === 'all' ? C.ink : C.border,
            }}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={(() => { const p = buildParams(); p.set('category', cat.slug); return `${baseUrl}?${p.toString()}`; })()}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap"
              style={{
                backgroundColor: categorySlug?.toLowerCase() === cat.slug ? C.ink : C.white,
                color: categorySlug?.toLowerCase() === cat.slug ? C.white : C.muted,
                borderColor: categorySlug?.toLowerCase() === cat.slug ? C.ink : C.border,
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GFButton
            variant="outline"
            size="sm"
            iconLeft={<SlidersHorizontal size={14} />}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            Filters
          </GFButton>
          <div className="relative">
            <select
              value={sort || ''}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 rounded-xl border text-sm font-medium focus:outline-none cursor-pointer"
              style={{ backgroundColor: C.white, borderColor: C.border, color: C.ink }}
            >
              {sortOptions.map((o) => (
                <option key={o.value || 'best'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: C.muted }}
            />
          </div>
        </div>
      </div>

      {filterOpen && (
        <div
          className="rounded-2xl border p-6 mb-6 grid md:grid-cols-4 gap-6"
          style={{ backgroundColor: C.white, borderColor: C.border }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
              Budget
            </p>
            <div className="flex flex-col gap-2">
              {BUDGET_OPTIONS.map((opt) => (
                <label key={opt.value || 'any'} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.ink }}>
                  <input
                    type="radio"
                    name="budget"
                    className="accent-orange-500"
                    checked={(budget || '') === opt.value}
                    onChange={() => handleFilter('budget', opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
              Delivery Time
            </p>
            <div className="flex flex-col gap-2">
              {DELIVERY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.ink }}>
                  <input
                    type="radio"
                    name="delivery"
                    className="accent-orange-500"
                    checked={delivery === opt.value || (!delivery && opt.value === 'any')}
                    onChange={() => handleFilter('delivery', opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
              Min. Rating
            </p>
            <div className="flex flex-col gap-2">
              {RATING_OPTIONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.ink }}>
                  <input
                    type="radio"
                    name="rating"
                    className="accent-orange-500"
                    checked={minRating === String(r)}
                    onChange={() => handleFilter('min_rating', minRating === String(r) ? '' : String(r))}
                  />
                  <Star size={12} fill={C.brand} color={C.brand} /> {r}+
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.ink }}>
                <input
                  type="radio"
                  name="rating"
                  className="accent-orange-500"
                  checked={!minRating}
                  onChange={() => handleFilter('min_rating', '')}
                />
                Any
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {gigs.map((gig) => (
          <Link key={gig.id} href={`/g/${gig.slug}`}>
            <GFCard hover className="group overflow-hidden">
              <div className="aspect-[16/10] overflow-hidden relative" style={{ backgroundColor: C.surfaceAlt }}>
                {gig.coverUrl ? (
                  <img
                    src={gig.coverUrl}
                    alt={gig.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                {gig.badge && (
                  <div className="absolute top-3 left-3">
                    <GFBadge variant={gig.badge === 'Pro' ? 'dark' : 'brand'}>{gig.badge}</GFBadge>
                  </div>
                )}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                  <GigCardHeartButton gigId={gig.id} />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GFAvatar src={gig.sellerAvatarUrl ?? undefined} name={gig.sellerDisplayName} size="sm" />
                  <span className="text-xs font-medium" style={{ color: C.muted }}>
                    {gig.sellerName}
                  </span>
                </div>
                <h3 className="text-sm font-semibold leading-snug mb-2.5 line-clamp-2" style={{ color: C.ink }}>
                  {gig.title}
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  {gig.reviewCount > 0 && gig.avgRating ? (
                    <StarRating rating={gig.avgRating} count={gig.reviewCount} size={13} />
                  ) : (
                    <span className="text-xs" style={{ color: C.muted }}>
                      No reviews yet
                    </span>
                  )}
                  <span className="text-xs flex items-center gap-1" style={{ color: C.muted }}>
                    <Clock size={11} />
                    {gig.deliveryDays} days
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.border }}>
                  <span className="text-xs uppercase tracking-wide font-medium" style={{ color: C.muted }}>
                    Starting at
                  </span>
                  <span className="text-base font-bold" style={{ color: C.ink }}>
                    ${gig.minPrice}
                  </span>
                </div>
              </div>
            </GFCard>
          </Link>
        ))}
      </div>

      {gigs.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: C.white, borderColor: C.border, borderWidth: 1 }}
        >
          <p style={{ color: C.muted }}>No gigs found. Try a different search or category.</p>
        </div>
      )}
    </div>
  );
}
