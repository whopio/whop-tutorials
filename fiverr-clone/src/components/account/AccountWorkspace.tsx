'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  DollarSign,
  Star,
  Clock,
  ChevronRight,
  TrendingUp,
  Download,
  MessageSquare,
  RefreshCw,
  Check,
} from 'lucide-react';
import { C, GFButton, GFBadge, StatusPill, GFAvatar } from '@/components/gigflow/design-system';
import { statusConfig } from '@/components/gigflow/design-system';

type Tab = 'buying' | 'selling';

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

interface AccountWorkspaceProps {
  buyerOrders: BuyerOrder[];
  sellerOrders: SellerOrder[];
  sellerStats: {
    totalEarnings: string;
    activeOrders: number;
    avgRating: string;
    responseRate: string;
  } | null;
  isSeller: boolean;
}

const statusFilters = ['all', 'in_progress', 'delivered', 'completed', 'revision_requested', 'cancelled'];

function mapStatusToPill(status: string): keyof typeof statusConfig {
  const m: Record<string, keyof typeof statusConfig> = {
    awaiting_requirements: 'pending',
    in_progress: 'in_progress',
    delivered: 'delivered',
    completed: 'completed',
    revision_requested: 'revision',
    cancelled: 'cancelled',
    disputed: 'disputed',
  };
  return (m[status] || 'pending') as keyof typeof statusConfig;
}

export function AccountWorkspace({
  buyerOrders,
  sellerOrders,
  sellerStats,
  isSeller,
}: AccountWorkspaceProps) {
  const [tab, setTab] = useState<Tab>('buying');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBuyer = buyerOrders.filter(
    (o) => statusFilter === 'all' || o.status === statusFilter
  );
  const filteredSeller = sellerOrders.filter(
    (o) => statusFilter === 'all' || o.status === statusFilter
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.ink }}>
            My Workspace
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            Manage orders, track projects, and grow your business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GFButton variant="outline" size="sm" iconLeft={<Download size={14} />}>
            Export
          </GFButton>
          <Link href={isSeller ? '/sell/gigs/new' : '/sell/onboarding'}>
            <GFButton variant="brand" size="sm">Create Gig</GFButton>
          </Link>
        </div>
      </div>

      {sellerStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Earnings', value: sellerStats.totalEarnings, change: '+12%', icon: DollarSign, positive: true },
            { label: 'Active Orders', value: String(sellerStats.activeOrders), change: '', icon: Package, positive: true },
            { label: 'Avg. Rating', value: sellerStats.avgRating, change: '0', icon: Star, positive: true },
            {
              label: 'Response Rate',
              value: sellerStats.responseRate === 'N/A' ? 'N/A' : sellerStats.responseRate,
              change: sellerStats.responseRate === 'N/A' ? '' : '+1%',
              icon: Clock,
              positive: true,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl border p-5"
              style={{ backgroundColor: C.white, borderColor: C.border }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: C.brandMuted }}
                >
                  <stat.icon size={18} style={{ color: C.brand }} />
                </div>
                {stat.change && stat.change !== '0' && (
                  <span
                    className="text-xs font-semibold flex items-center gap-0.5"
                    style={{ color: stat.positive ? C.success : C.error }}
                  >
                    <TrendingUp size={11} /> {stat.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold" style={{ color: C.ink }}>
                {stat.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="flex items-center gap-2 mb-6 p-1.5 rounded-2xl inline-flex border"
        style={{ backgroundColor: C.white, borderColor: C.border }}
      >
        {(['buying', 'selling'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize"
            style={{
              backgroundColor: tab === t ? C.ink : 'transparent',
              color: tab === t ? C.white : C.muted,
            }}
          >
            {t === 'buying' ? 'Orders (Buying)' : 'Orders (Selling)'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {statusFilters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize"
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

      {tab === 'buying' && (
        <div className="flex flex-col gap-3">
          {filteredBuyer.length === 0 ? (
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
            filteredBuyer.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="rounded-2xl border p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: C.surfaceAlt }}>
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

      {tab === 'selling' && (
        <div className="flex flex-col gap-3">
          {filteredSeller.length === 0 ? (
            <div
              className="rounded-2xl border-2 border-dashed p-6 text-center"
              style={{ borderColor: C.border }}
            >
              <p className="font-semibold text-sm mb-1" style={{ color: C.ink }}>
                Create a new gig
              </p>
              <p className="text-xs mb-4" style={{ color: C.muted }}>
                Start earning by offering your services on gigflow
              </p>
              <Link href={isSeller ? '/sell/gigs/new' : '/sell/onboarding'}>
                <GFButton variant="brand" size="sm">+ New Gig</GFButton>
              </Link>
            </div>
          ) : (
            <>
              {filteredSeller.map((order) => (
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
              <div
                className="rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer hover:border-orange-300 transition-all"
                style={{ borderColor: C.border }}
              >
                <Link href="/sell/gigs/new">
                  <p className="font-semibold text-sm mb-1" style={{ color: C.ink }}>
                    Create a new gig
                  </p>
                  <p className="text-xs mb-4" style={{ color: C.muted }}>
                    Start earning by offering your services on gigflow
                  </p>
                  <GFButton variant="brand" size="sm">+ New Gig</GFButton>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
