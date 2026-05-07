'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { C, GFButton, StatusPill, GFAvatar } from '@/components/gigflow/design-system';
import { NavAccount } from '@/components/layout/NavAccount';
import { statusConfig } from '@/components/gigflow/design-system';
import { OrderDeliveriesList } from './OrderDeliveriesList';
import { OrderDeliveryForm } from './OrderDeliveryForm';

interface Requirement {
  id: string;
  type: 'text' | 'textarea';
  question: string;
  required: boolean;
}

interface OrderTrackSellerClientProps {
  orderId: string;
  gigTitle: string;
  coverUrl: string | null;
  packageTitle: string;
  packagePriceCents: number;
  revisionsIncluded: number;
  createdAt: string;
  dueAt: string | null;
  orderStatus: string;
  orderReqs: { answers: Record<string, string>; attachments: unknown[]; submitted_at: string | null } | null;
  validReqs: Requirement[];
  buyerUserId: string | null;
  buyerDisplayName: string;
  buyerUsername: string | null;
  buyerAvatarUrl?: string | null;
  buyerEmail?: string | null;
  gigId: string;
  deliveries: Array<{ id: string; delivered_at: string; message: string | null; items: Array<{ url?: string; name?: string }> }>;
}

function mapStatusToPill(status: string): keyof typeof statusConfig {
  const m: Record<string, keyof typeof statusConfig> = {
    awaiting_requirements: 'awaiting_requirements',
    in_progress: 'in_progress',
    delivered: 'delivered',
    completed: 'completed',
    revision_requested: 'revision_requested',
    cancelled: 'cancelled',
  };
  return (m[status] || 'awaiting_requirements') as keyof typeof statusConfig;
}

export function OrderTrackSellerClient({
  orderId,
  gigTitle,
  coverUrl,
  packageTitle,
  packagePriceCents,
  revisionsIncluded,
  createdAt,
  dueAt,
  orderStatus,
  orderReqs,
  validReqs,
  buyerUserId,
  buyerDisplayName,
  buyerUsername,
  buyerAvatarUrl,
  buyerEmail,
  gigId,
  deliveries,
}: OrderTrackSellerClientProps) {
  const canDeliver = ['in_progress', 'revision_requested'].includes(orderStatus);
  const dueDate = dueAt ? new Date(dueAt).toLocaleDateString() : '—';

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm mb-1" style={{ color: C.muted }}>
              <Link href="/sell/dashboard" className="hover:opacity-70 transition">Seller Dashboard</Link>
              <ChevronRight size={14} />
              <span className="font-mono font-medium" style={{ color: C.ink }}>{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: C.ink }}>{gigTitle || 'Order'}</h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              {packageTitle} · ${(packagePriceCents / 100).toFixed(2)}
            </p>
          </div>
          <StatusPill status={mapStatusToPill(orderStatus)} />
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main content */}
          <div className="flex flex-col gap-6">
            {/* Gig cover + order info */}
            <div className="rounded-2xl border p-6" style={{ backgroundColor: C.white, borderColor: C.border }}>
              <div className="flex gap-4 mb-6">
                <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: C.surface }}>
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: C.muted }}>—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs" style={{ color: C.muted }}>{orderId.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm mt-1" style={{ color: C.muted }}>Ordered {new Date(createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Buyer requirements */}
              {orderReqs?.submitted_at ? (
                <div className="border-t pt-6" style={{ borderColor: C.border }}>
                  <h2 className="font-semibold text-sm mb-2" style={{ color: C.ink }}>Buyer&apos;s requirements</h2>
                  <p className="text-xs mb-4" style={{ color: C.muted }}>
                    Submitted {new Date(orderReqs.submitted_at).toLocaleString()}
                  </p>
                  <div className="space-y-3">
                    {validReqs.map((r) => {
                      const ans = (orderReqs.answers as Record<string, string>)?.[r.id] ?? '—';
                      return (
                        <div key={r.id}>
                          <p className="text-xs font-medium" style={{ color: C.muted }}>{r.question}</p>
                          <p className="text-sm whitespace-pre-wrap mt-0.5" style={{ color: C.ink }}>{ans}</p>
                        </div>
                      );
                    })}
                    {((orderReqs.attachments as Array<{ url?: string; name?: string }>)?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>Attachments</p>
                        <ul className="list-disc list-inside text-sm">
                          {(orderReqs.attachments as Array<{ url?: string; name?: string }>).map((a, i) => (
                            <li key={i}>
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: C.brand }}>
                                {a.name || a.url || 'Link'}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : orderStatus === 'awaiting_requirements' ? (
                <div className="border-t pt-6" style={{ borderColor: C.border }}>
                  <p className="text-sm" style={{ color: C.muted }}>
                    Waiting for buyer to submit requirements.
                  </p>
                </div>
              ) : null}

              {/* Deliveries */}
              <OrderDeliveriesList deliveries={deliveries} />

              {/* Deliver form */}
              {canDeliver && (
                <div className="border-t pt-6" style={{ borderColor: C.border }}>
                  <h2 className="font-semibold text-sm mb-4" style={{ color: C.ink }}>Deliver work</h2>
                  <OrderDeliveryForm orderId={orderId} />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: C.white, borderColor: C.border }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: C.ink }}>Order details</h3>
              <div className="space-y-3">
                {[
                  ['Order ID', orderId.slice(0, 8).toUpperCase()],
                  ['Package', packageTitle],
                  ['Total', `$${(packagePriceCents / 100).toFixed(2)}`],
                  ['Revisions', `${revisionsIncluded} included`],
                  ['Delivery due', dueDate],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 border-b text-sm" style={{ borderColor: C.border }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span className="font-medium" style={{ color: C.ink }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {(buyerUserId || buyerEmail) && (
              <div className="rounded-2xl border p-5" style={{ backgroundColor: C.white, borderColor: C.border }}>
                <div className="flex items-center gap-3 mb-3">
                  <GFAvatar src={buyerAvatarUrl ?? undefined} name={buyerDisplayName} size="lg" />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: C.ink }}>{buyerDisplayName}</p>
                    {buyerUsername && (
                      <p className="text-xs" style={{ color: C.muted }}>@{buyerUsername}</p>
                    )}
                    {buyerEmail && (
                      <p className="text-xs" style={{ color: C.muted }}>{buyerEmail}</p>
                    )}
                  </div>
                </div>
                {buyerUserId && (
                  <Link
                    href={`/messages?buyerId=${buyerUserId}&gigId=${gigId}&gigTitle=${encodeURIComponent(gigTitle)}`}
                  >
                    <GFButton variant="outline" size="sm" className="w-full" iconLeft={<MessageSquare size={14} />}>
                      Message buyer
                    </GFButton>
                  </Link>
                )}
              </div>
            )}

            <Link href="/sell/dashboard">
              <GFButton variant="outline" size="sm" className="w-full">
                ← Back to Dashboard
              </GFButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
