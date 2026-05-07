'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Eye,
  Edit3,
  Pause,
  Trash2,
  TrendingUp,
  DollarSign,
  Star,
  Package,
  Clock,
  BarChart3,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { C, GFButton, GFBadge, StarRating, StatusPill, GFAvatar, statusConfig } from '@/components/gigflow/design-system';

type OrderTab = 'buying' | 'selling';
const STATUS_FILTERS = ['all', 'in_progress', 'delivered', 'completed', 'revision_requested', 'cancelled'];

function mapStatusToPill(status: string): keyof typeof statusConfig {
  const m: Record<string, keyof typeof statusConfig> = {
    awaiting_requirements: 'awaiting_requirements',
    in_progress: 'in_progress',
    delivered: 'delivered',
    completed: 'completed',
    revision_requested: 'revision_requested',
    cancelled: 'cancelled',
    disputed: 'disputed',
  };
  return (m[status] || 'awaiting_requirements') as keyof typeof statusConfig;
}
import { NavAccount } from '@/components/layout/NavAccount';
import { DashboardBalanceWithdraw } from './DashboardBalanceWithdraw';

interface EarningsMonth {
  month: string;
  amount: number;
}

interface GigItem {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  status: string;
  orders: number;
  views: number;
  clicks: number;
  rating: number;
  reviews: number;
  price: number;
  earnings: number;
}

interface BuyerOrder {
  id: string;
  gig: string;
  seller: string;
  sellerAvatar: string | null;
  price: number;
  status: string;
  date: string;
  imageUrl: string | null;
  packageName: string;
}

interface SellerOrder {
  id: string;
  gig: string;
  buyer: string;
  buyerAvatar: string | null;
  price: number;
  status: string;
  date: string;
  dueDate: string;
}

interface SellerDashboardClientProps {
  thisMonthEarnings: number;
  activeOrders: number;
  activeOrdersDueThisWeek: number;
  avgRating: number | null;
  reviewsCount: number;
  responseRate: string;
  earningsByMonth: EarningsMonth[];
  totalEarnings: number;
  gigs: GigItem[];
  sellerLevel: string;
  nextLevelLabel: string;
  nextLevelOrders: number;
  levelProgressPercent: number;
  profileUsername: string | null;
  buyerOrders: BuyerOrder[];
  sellerOrders: SellerOrder[];
}

export function SellerDashboardClient({
  thisMonthEarnings,
  activeOrders,
  activeOrdersDueThisWeek,
  avgRating,
  reviewsCount,
  responseRate,
  earningsByMonth,
  totalEarnings,
  gigs,
  sellerLevel,
  nextLevelLabel,
  nextLevelOrders,
  levelProgressPercent,
  profileUsername,
  buyerOrders,
  sellerOrders,
}: SellerDashboardClientProps) {
  const [orderTab, setOrderTab] = useState<OrderTab>('buying');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gigStatuses, setGigStatuses] = useState<Record<string, string>>(
    Object.fromEntries(gigs.map((g) => [g.id, g.status]))
  );

  const toggleStatus = (id: string) => {
    setGigStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === 'published' ? 'paused' : 'published',
    }));
  };

  const maxEarning = earningsByMonth.length > 0 ? Math.max(...earningsByMonth.map((d) => d.amount), 1) : 1;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: C.ink }}>
              Seller Dashboard
            </h1>
            <p className="text-sm mt-0.5" style={{ color: C.muted }}>
              Manage your gigs, track performance, and grow your business
            </p>
          </div>
          <Link href="/sell/gigs/new" className="flex-shrink-0">
            <GFButton variant="brand" iconLeft={<Plus size={16} />} className="min-h-[44px]">
              New Gig
            </GFButton>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'This Month',
              value: `$${thisMonthEarnings.toLocaleString()}`,
              sub: 'vs last month',
              icon: DollarSign,
              color: C.brand,
              showTrend: true,
              subColor: C.success,
            },
            {
              label: 'Active Orders',
              value: String(activeOrders),
              sub: activeOrdersDueThisWeek > 0 ? `${activeOrdersDueThisWeek} due this week` : 'All caught up',
              icon: Package,
              color: C.info,
              showTrend: true,
              subColor: C.success,
            },
            {
              label: 'Avg Rating',
              value: avgRating ? avgRating.toFixed(2) : '—',
              sub: `${reviewsCount} total reviews`,
              icon: Star,
              color: C.warning,
              showTrend: true,
              subColor: C.success,
            },
            {
              label: 'Response Rate',
              value: responseRate === 'N/A' ? 'N/A' : responseRate,
              sub: responseRate === 'N/A' ? 'Not enough data yet' : 'Avg reply time',
              icon: Clock,
              color: C.success,
              showTrend: responseRate !== 'N/A',
              subColor: responseRate === 'N/A' ? C.muted : C.success,
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border p-5"
              style={{ backgroundColor: C.white, borderColor: C.border }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${s.color}18` }}
                >
                  <s.icon size={17} style={{ color: s.color }} />
                </div>
                {s.showTrend ? <TrendingUp size={14} style={{ color: C.success }} /> : <span className="w-[14px]" aria-hidden />}
              </div>
              <div className="text-2xl font-bold" style={{ color: C.ink }}>
                {s.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                {s.label}
              </div>
              <div className="text-xs mt-1.5 font-medium" style={{ color: s.subColor }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 mb-8">
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: C.white, borderColor: C.border }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold" style={{ color: C.ink }}>
                  Earnings Overview
                </h2>
                <p className="text-sm" style={{ color: C.muted }}>
                  Last 5 months
                </p>
              </div>
              <div className="text-2xl font-bold" style={{ color: C.brand }}>
                ${(totalEarnings / 100).toLocaleString()}
              </div>
            </div>
            <div className="flex items-end gap-2 sm:gap-3 h-32">
              {earningsByMonth.map((d, i) => (
                <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                  <span className="text-xs font-mono truncate w-full text-center" style={{ color: C.muted }}>
                    ${(d.amount / 1000).toFixed(1)}k
                  </span>
                  <div
                    className="w-full min-w-[20px] sm:min-w-0 rounded-t-lg transition-all hover:opacity-80 cursor-default"
                    style={{
                      height: `${(d.amount / maxEarning) * 80}px`,
                      background:
                        i === earningsByMonth.length - 1
                          ? `linear-gradient(180deg, ${C.brandLight}, ${C.brand})`
                          : C.surface,
                      border: `1px solid ${C.border}`,
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: i === earningsByMonth.length - 1 ? C.brand : C.muted }}
                  >
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <DashboardBalanceWithdraw />
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: C.white, borderColor: C.border }}
            >
              <h3 className="font-bold text-sm mb-4" style={{ color: C.ink }}>
                Quick actions
              </h3>
              <div className="flex flex-col gap-2">
                <Link
                  href={profileUsername ? `/s/${profileUsername}` : '/account/settings'}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all hover:shadow-sm"
                  style={{ borderColor: C.border, color: C.ink, backgroundColor: C.surface }}
                >
                  <ExternalLink size={15} style={{ color: C.muted }} />
                  View public profile
                </Link>
                <Link
                  href="/account/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all hover:shadow-sm"
                  style={{ borderColor: C.border, color: C.ink, backgroundColor: C.surface }}
                >
                  <BarChart3 size={15} style={{ color: C.muted }} />
                  Manage availability
                </Link>
              </div>
            </div>

            {nextLevelOrders > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ background: `linear-gradient(135deg, ${C.ink}, #1a1a2e)` }}
              >
                <GFBadge variant="brand">{sellerLevel}</GFBadge>
                <p className="text-white font-semibold mt-3 text-sm">Keep it up!</p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {nextLevelOrders} more order{nextLevelOrders === 1 ? '' : 's'} until {nextLevelLabel}
                </p>
                <div
                  className="mt-3 w-full h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${levelProgressPercent}%`, backgroundColor: C.brand }}
                  />
                </div>
                <div
                  className="flex justify-between text-xs mt-1"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <span>{sellerLevel}</span>
                  <span>{nextLevelLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders – Buying / Selling */}
        <div className="mb-8">
          <div
            className="flex flex-wrap items-center gap-2 mb-6 p-1.5 rounded-2xl inline-flex border"
            style={{ backgroundColor: C.white, borderColor: C.border }}
          >
            {(['buying', 'selling'] as OrderTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderTab(t)}
                className="px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize min-h-[44px]"
                style={{
                  backgroundColor: orderTab === t ? C.ink : 'transparent',
                  color: orderTab === t ? C.white : C.muted,
                }}
              >
                <span className="sm:hidden">{t === 'buying' ? 'Buying' : 'Selling'}</span>
                <span className="hidden sm:inline">{t === 'buying' ? 'Orders (Buying)' : 'Orders (Selling)'}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className="px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize min-h-[44px] sm:min-h-0"
                style={{
                  backgroundColor: statusFilter === f ? C.ink : C.white,
                  color: statusFilter === f ? C.white : C.muted,
                  borderColor: statusFilter === f ? C.ink : C.border,
                }}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {orderTab === 'buying' && (
            <div className="flex flex-col gap-3">
              {buyerOrders.filter((o) => statusFilter === 'all' || o.status === statusFilter).length === 0 ? (
                <div
                  className="rounded-2xl p-12 text-center"
                  style={{ backgroundColor: C.white, borderColor: C.border, borderWidth: 1 }}
                >
                  <p className="mb-4" style={{ color: C.muted }}>
                    You haven&apos;t placed any orders yet.
                  </p>
                  <Link href="/search">
                    <GFButton variant="brand" size="sm">Browse Services</GFButton>
                  </Link>
                </div>
              ) : (
                buyerOrders
                  .filter((o) => statusFilter === 'all' || o.status === statusFilter)
                  .map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="rounded-2xl border p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                      style={{ backgroundColor: C.white, borderColor: C.border }}
                    >
                      <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: C.surface }}>
                        {order.imageUrl ? (
                          <img src={order.imageUrl} alt={order.gig} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: C.muted }}>—</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold" style={{ color: C.muted }}>
                            {order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <StatusPill status={mapStatusToPill(order.status)} />
                          <GFBadge variant="default">{order.packageName}</GFBadge>
                        </div>
                        <p className="font-semibold text-sm truncate" style={{ color: C.ink }}>
                          {order.gig}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <GFAvatar src={order.sellerAvatar ?? undefined} name={order.seller} size="xs" />
                          <span className="text-xs" style={{ color: C.muted }}>
                            by {order.seller}
                          </span>
                          <span className="text-xs" style={{ color: C.muted }}>· {order.date}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-base" style={{ color: C.ink }}>
                          ${order.price}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                          Total paid
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: C.muted }} />
                    </Link>
                  ))
              )}
            </div>
          )}

          {orderTab === 'selling' && (
            <div className="flex flex-col gap-3">
              {sellerOrders.filter((o) => statusFilter === 'all' || o.status === statusFilter).length === 0 ? (
                <div
                  className="rounded-2xl border-2 border-dashed p-6 text-center"
                  style={{ borderColor: C.border }}
                >
                  <p className="font-semibold text-sm mb-1" style={{ color: C.ink }}>
                    No selling orders yet
                  </p>
                  <p className="text-xs mb-4" style={{ color: C.muted }}>
                    Deliver on buyer orders to grow your business
                  </p>
                  <Link href="/sell/gigs/new">
                    <GFButton variant="brand" size="sm">+ New Gig</GFButton>
                  </Link>
                </div>
              ) : (
                <>
                  {sellerOrders
                    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
                    .map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="rounded-2xl border p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                        style={{ backgroundColor: C.white, borderColor: C.border }}
                      >
                        <GFAvatar src={order.buyerAvatar ?? undefined} name={order.buyer} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-semibold" style={{ color: C.muted }}>
                              {order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <StatusPill status={mapStatusToPill(order.status)} />
                          </div>
                          <p className="font-semibold text-sm truncate" style={{ color: C.ink }}>
                            {order.gig}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs" style={{ color: C.muted }}>
                              from {order.buyer}
                            </span>
                            <span className="text-xs" style={{ color: C.muted }}>
                              · Due {order.dueDate}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-base" style={{ color: C.success }}>
                            ${order.price}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                            Earnings
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: C.muted }} />
                      </Link>
                    ))}
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ color: C.ink }}>
              My Gigs
            </h2>
            <span className="text-sm font-mono" style={{ color: C.muted }}>
              {gigs.length} gigs
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {gigs.map((gig) => {
              const status = gigStatuses[gig.id] ?? gig.status;
              const isActive = status === 'published';
              const views = gig.views || gig.orders * 10;
              const clicks = gig.clicks || Math.floor(views * 0.05);
              const ctr = views > 0 ? (clicks / views) * 100 : 0;

              return (
                <div
                  key={gig.id}
                  className="rounded-2xl border p-4 transition-all"
                  style={{
                    backgroundColor: C.white,
                    borderColor: C.border,
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
                    {/* Image + main content */}
                    <div className="flex gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--gray-100)]">
                        {gig.image ? (
                          <img src={gig.image} alt={gig.title} className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xs"
                            style={{ color: C.muted }}
                          >
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <GFBadge variant={isActive ? 'success' : 'default'} dot>
                            {isActive ? 'Active' : 'Paused'}
                          </GFBadge>
                          <span className="text-xs font-mono" style={{ color: C.muted }}>
                            From ${gig.price}
                          </span>
                        </div>
                        <p className="font-semibold text-sm line-clamp-2 break-words" style={{ color: C.ink }}>
                          {gig.title}
                        </p>
                        <div
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-1"
                          style={{ color: C.muted }}
                        >
                          <span className="flex items-center gap-1">
                            <Eye size={11} />
                            {views.toLocaleString()} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Package size={11} />
                            {gig.orders} orders
                          </span>
                          <span className="flex items-center gap-1">
                            <StarRating rating={gig.rating} size={11} count={gig.reviews} />
                          </span>
                          <span className="font-semibold" style={{ color: C.success }}>
                            ${gig.earnings.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block w-24 flex-shrink-0">
                      <p className="text-xs mb-1 text-right font-mono" style={{ color: C.muted }}>
                        CTR {ctr.toFixed(1)}%
                      </p>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: C.border }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(ctr, 100)}%`,
                            backgroundColor: C.brand,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 md:justify-start flex-shrink-0">
                      <Link
                        href={`/g/${gig.slug}`}
                        className="p-2 rounded-xl hover:bg-black/5 transition"
                        title="Preview gig"
                        style={{ color: C.muted }}
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/sell/gigs/${gig.id}/edit`}
                        className="p-2 rounded-xl hover:bg-black/5 transition"
                        title="Edit gig"
                        style={{ color: C.muted }}
                      >
                        <Edit3 size={15} />
                      </Link>
                      <button
                        type="button"
                        className="p-2 rounded-xl hover:bg-black/5 transition"
                        onClick={() => toggleStatus(gig.id)}
                        title={isActive ? 'Pause gig' : 'Activate gig'}
                        style={{ color: isActive ? C.warning : C.success }}
                      >
                        <Pause size={15} />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-xl hover:bg-red-50 transition"
                        title="Delete gig"
                        style={{ color: C.error }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link
              href="/sell/gigs/new"
              className="rounded-2xl border-2 border-dashed p-6 flex items-center justify-center gap-3 hover:border-orange-400 hover:bg-orange-50/30 transition-all block"
              style={{ borderColor: C.border }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: C.brandMuted }}
              >
                <Plus size={18} style={{ color: C.brand }} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: C.ink }}>
                  Create a new gig
                </p>
                <p className="text-xs" style={{ color: C.muted }}>
                  Start earning with a new service offering
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
