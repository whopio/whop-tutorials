'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock,
  MessageSquare,
  Download,
  RefreshCw,
  Star,
  AlertTriangle,
  ChevronRight,
  Paperclip,
  Send,
  Package,
  ThumbsUp,
} from 'lucide-react';
import { C, GFButton, GFBadge, GFProgress, StatusPill, GFAvatar, GFTextarea } from '@/components/gigflow/design-system';
import { NavAccount } from '@/components/layout/NavAccount';
import { OrderRequirementsForm } from '@/components/checkout/OrderRequirementsForm';
import { AcceptDeliveryButton } from '@/components/orders/AcceptDeliveryButton';
import { cn } from '@/lib/utils';

type View = 'tracking' | 'delivery' | 'revision' | 'review';

interface DeliveryItem {
  id: string;
  delivered_at: string;
  message: string | null;
  items: Array<{ url?: string; name?: string }>;
}

interface Requirement {
  id: string;
  type: 'text' | 'textarea';
  question: string;
  required: boolean;
}

interface OrderTrackClientProps {
  orderId: string;
  gigId: string;
  orderStatus: string;
  createdAt: string;
  dueAt: string | null;
  gigTitle: string;
  gigSlug: string;
  coverUrl: string | null;
  packageTitle: string;
  packagePriceCents: number;
  revisionsIncluded: number;
  deliveries: DeliveryItem[];
  sellerUserId: string;
  sellerDisplayName: string;
  sellerUsername: string | null;
  sellerAvatarUrl: string | null;
  showRequirementsForm: boolean;
  requirements: Requirement[];
  statusPillKey: 'in_progress' | 'delivered' | 'revision_requested' | 'completed' | 'awaiting_requirements';
}

const TIMELINE_ICONS = { Package, ThumbsUp, RefreshCw, Send, Star, Check };

export function OrderTrackClient({
  orderId,
  gigId,
  orderStatus,
  createdAt,
  dueAt,
  gigTitle,
  gigSlug,
  coverUrl,
  packageTitle,
  packagePriceCents,
  revisionsIncluded,
  deliveries,
  sellerUserId,
  sellerDisplayName,
  sellerUsername,
  sellerAvatarUrl,
  showRequirementsForm,
  requirements,
  statusPillKey,
}: OrderTrackClientProps) {
  const [view, setView] = useState<View>(
    orderStatus === 'delivered' ? 'delivery' : orderStatus === 'awaiting_requirements' && showRequirementsForm ? 'tracking' : 'tracking'
  );
  const [revisionText, setRevisionText] = useState('');
  const [reviewRatings, setReviewRatings] = useState({ overall: 5, communication: 5, delivery: 5, quality: 5 });
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const router = useRouter();

  const latestDelivery = deliveries[0];
  const deliveryItems = latestDelivery?.items ?? [];
  const galleryUrls = (coverUrl ? [coverUrl] : []).concat(
    (deliveryItems as Array<{ url?: string }>).filter((i) => i.url).slice(0, 2).map((i) => i.url!)
  );

  const doneCount =
    orderStatus === 'completed'
      ? 6
      : orderStatus === 'delivered'
        ? 4
        : orderStatus === 'revision_requested'
          ? 3
          : orderStatus === 'in_progress'
            ? 3
            : orderStatus === 'awaiting_requirements'
              ? 1
              : 2;

  const timeline = [
    { status: 'done', title: 'Order placed', desc: 'Your order was confirmed and payment secured.', time: new Date(createdAt).toLocaleString(), icon: 'Package' },
    { status: showRequirementsForm ? 'active' : 'done', title: 'Requirements', desc: 'Submit your project details.', time: showRequirementsForm ? 'Pending' : 'Done', icon: 'ThumbsUp' },
    { status: ['in_progress', 'delivered', 'completed'].includes(orderStatus) ? 'done' : doneCount >= 3 ? 'active' : 'pending', title: 'In progress', desc: 'Seller is working on your order.', time: orderStatus === 'in_progress' ? 'Ongoing' : latestDelivery?.delivered_at ? new Date(latestDelivery.delivered_at).toLocaleString() : '—', icon: 'RefreshCw' },
    { status: orderStatus === 'delivered' || orderStatus === 'completed' ? 'done' : 'pending', title: 'Delivery', desc: 'Seller delivers the completed work.', time: dueAt ? new Date(dueAt).toLocaleDateString() : '—', icon: 'Send' },
    { status: orderStatus === 'completed' ? 'done' : 'pending', title: 'Review & approve', desc: 'Review and accept or request a revision.', time: orderStatus === 'delivered' ? 'Now' : 'After delivery', icon: 'Star' },
    { status: orderStatus === 'completed' ? 'done' : 'pending', title: 'Order complete', desc: 'Funds released. Leave your review.', time: 'Final step', icon: 'Check' },
  ];

  const handleRequestRevision = async () => {
    setRevisionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/request-revision`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setView('tracking');
      if (typeof window !== 'undefined') window.location.reload();
    } catch {
      setRevisionLoading(false);
    }
  };

  const orderDetails = [
    ['Order ID', `ORD-${orderId.slice(0, 8).toUpperCase()}`],
    ['Package', packageTitle],
    ['Total paid', `$${(packagePriceCents / 100).toFixed(0)}`],
    ['Revisions', `${revisionsIncluded}`],
    ['Delivery due', dueAt ? new Date(dueAt).toLocaleDateString() : '—'],
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm mb-1" style={{ color: C.muted }}>
              <Link href="/account" className="hover:opacity-70 transition">My Orders</Link>
              <ChevronRight size={14} />
              <span className="font-mono font-medium" style={{ color: C.ink }}>ORD-{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: C.ink }}>{gigTitle}</h1>
          </div>
          <StatusPill status={statusPillKey} />
        </div>

        {showRequirementsForm ? (
          <div className="rounded-2xl border p-6" style={{ backgroundColor: C.white, borderColor: C.border }}>
            <h2 className="font-bold mb-4" style={{ color: C.ink }}>Submit your details</h2>
            <p className="text-sm mb-6" style={{ color: C.muted }}>
              Please provide the following so the seller can start your order:
            </p>
            <OrderRequirementsForm orderId={orderId} requirements={requirements} gigTitle={gigTitle} />
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 border-b pb-4" style={{ borderColor: C.border }}>
              {(['tracking', 'delivery', 'revision', 'review'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize', view === v && 'shadow-sm')}
                  style={{
                    backgroundColor: view === v ? C.ink : 'transparent',
                    color: view === v ? C.white : C.muted,
                  }}
                >
                  {v === 'review' ? 'Leave Review' : v.charAt(0).toUpperCase() + v.slice(1)}
                  {v === 'delivery' && orderStatus === 'delivered' && (
                    <span className="ml-1.5 w-2 h-2 rounded-full inline-block" style={{ backgroundColor: C.brand }} />
                  )}
                </button>
              ))}
            </div>

            {view === 'tracking' && (
              <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                <div className="rounded-2xl border p-6" style={{ backgroundColor: C.white, borderColor: C.border }}>
                  <h2 className="font-bold mb-2" style={{ color: C.ink }}>Order timeline</h2>
                  <p className="text-sm mb-6" style={{ color: C.muted }}>
                    Expected delivery: <strong>{dueAt ? new Date(dueAt).toLocaleDateString() : '—'}</strong>
                  </p>
                  <GFProgress value={doneCount} max={6} />
                  <div className="relative mt-8">
                    <div className="absolute left-4 top-4 bottom-0 w-px" style={{ backgroundColor: C.border }} />
                    {timeline.map((event, i) => {
                      const IconComp = TIMELINE_ICONS[event.icon as keyof typeof TIMELINE_ICONS] ?? Package;
                      const status = event.status as 'done' | 'active' | 'pending';
                      return (
                        <div key={i} className="flex items-start gap-4 pb-6 relative">
                          <div
                            className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: status === 'done' ? C.success : status === 'active' ? C.brand : C.border,
                              color: status === 'pending' ? C.muted : C.white,
                            }}
                          >
                            {status === 'done' ? (
                              <Check size={14} strokeWidth={3} />
                            ) : (
                              <IconComp size={14} className={status === 'active' ? 'animate-spin' : ''} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm" style={{ color: status === 'pending' ? C.muted : C.ink }}>{event.title}</p>
                              {status === 'active' && <GFBadge variant="brand" dot>Live</GFBadge>}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{event.desc}</p>
                            <p className="text-xs mt-1 font-mono" style={{ color: C.subtle }}>{event.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border p-5" style={{ backgroundColor: C.white, borderColor: C.border }}>
                    <h3 className="font-semibold text-sm mb-4" style={{ color: C.ink }}>Order details</h3>
                    {orderDetails.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2 border-b text-sm" style={{ borderColor: C.border }}>
                        <span style={{ color: C.muted }}>{k}</span>
                        <span className="font-medium" style={{ color: C.ink }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border p-5" style={{ backgroundColor: C.white, borderColor: C.border }}>
                    <div className="flex items-center gap-3 mb-3">
                      <GFAvatar src={sellerAvatarUrl ?? undefined} name={sellerDisplayName} size="sm" />
                      <div>
                        <p className="font-semibold text-sm" style={{ color: C.ink }}>{sellerDisplayName}</p>
                        <p className="text-xs" style={{ color: C.muted }}>@{sellerUsername || 'seller'}</p>
                      </div>
                    </div>
                    <Link href={`/messages?sellerId=${sellerUserId}&gigId=${gigId}&gigTitle=${encodeURIComponent(gigTitle)}`}>
                      <GFButton variant="outline" size="sm" className="w-full" iconLeft={<MessageSquare size={14} />}>
                        Send message
                      </GFButton>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {view === 'delivery' && orderStatus === 'delivered' && (
              <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                <div>
                  {!latestDelivery ? (
                    <div className="rounded-2xl border p-6" style={{ backgroundColor: C.white, borderColor: C.border }}>
                      <p className="text-sm" style={{ color: C.muted }}>Delivery details will appear here once the seller delivers.</p>
                    </div>
                  ) : (
                  <>
                  <div className="rounded-2xl border-2 p-5 mb-5 flex items-start gap-3" style={{ borderColor: C.brand, backgroundColor: C.brandMuted }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.brand }}>
                      <Send size={16} color="white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: C.ink }}>Delivery received!</p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                        {sellerDisplayName} delivered your order on {new Date(latestDelivery.delivered_at).toLocaleDateString()}. Review and either accept or request a revision.
                      </p>
                    </div>
                  </div>
                  {latestDelivery.message && (
                    <div className="rounded-2xl border p-5 mb-5" style={{ backgroundColor: C.white, borderColor: C.border }}>
                      <div className="flex items-center gap-3 mb-3">
                        <GFAvatar src={sellerAvatarUrl ?? undefined} name={sellerDisplayName} size="sm" />
                        <div>
                          <span className="font-semibold text-sm" style={{ color: C.ink }}>{sellerDisplayName}</span>
                          <span className="text-xs ml-2 font-mono" style={{ color: C.muted }}>{new Date(latestDelivery.delivered_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.muted }}>{latestDelivery.message}</p>
                    </div>
                  )}
                  <div className="rounded-2xl border p-5" style={{ backgroundColor: C.white, borderColor: C.border }}>
                    <h3 className="font-semibold text-sm mb-4" style={{ color: C.ink }}>Delivered files ({deliveryItems.length})</h3>
                    <div className="flex flex-col gap-3 mb-5">
                      {deliveryItems.map((item, i) => {
                        const url = item.url?.startsWith('http') ? item.url : item.url ? `https://${item.url}` : null;
                        const label = item.name || item.url || 'File';
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: C.border, backgroundColor: C.surface }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: C.brandMuted, color: C.brand }}>
                              {label.split('.').pop()?.toUpperCase() || 'FILE'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: C.ink }}>{label}</p>
                            </div>
                            {url && (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-black/5 transition">
                                <Download size={15} style={{ color: C.muted }} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {galleryUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {galleryUrls.slice(0, 3).map((url, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <div className="flex-1">
                      <AcceptDeliveryButton orderId={orderId} />
                    </div>
                    <GFButton variant="outline" size="lg" className="flex-1" iconLeft={<RefreshCw size={14} />} onClick={() => setView('revision')}>
                      Request Revision
                    </GFButton>
                  </div>
                  </>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border p-5" style={{ backgroundColor: C.white, borderColor: C.border }}>
                    <h3 className="font-semibold text-sm mb-4" style={{ color: C.ink }}>Order details</h3>
                    {orderDetails.slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2 border-b text-sm last:border-0" style={{ borderColor: C.border }}>
                        <span style={{ color: C.muted }}>{k}</span>
                        <span className="font-medium" style={{ color: C.ink }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border p-4 text-xs" style={{ backgroundColor: '#FFF7ED', borderColor: '#FDBA74', color: '#9A3412' }}>
                    <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertTriangle size={12} /> Auto-accept in 72 hours</p>
                    <p>If you don&apos;t respond, the order will be automatically accepted and funds released to the seller.</p>
                  </div>
                </div>
              </div>
            )}

            {view === 'revision' && orderStatus === 'delivered' && (
              <div className="max-w-2xl">
                <div className="rounded-2xl border p-6" style={{ backgroundColor: C.white, borderColor: C.border }}>
                  <h2 className="font-bold mb-1" style={{ color: C.ink }}>Request a revision</h2>
                  <p className="text-sm mb-5" style={{ color: C.muted }}>
                    You have <span className="font-semibold" style={{ color: C.ink }}>{revisionsIncluded} revisions</span> remaining. Be as specific as possible.
                  </p>
                  <div className="flex flex-col gap-4">
                    <GFTextarea
                      label="What needs to be changed? *"
                      value={revisionText}
                      onChange={(e) => setRevisionText(e.target.value)}
                      placeholder="Please be specific..."
                      rows={5}
                    />
                    <div className="flex gap-3">
                      <GFButton variant="brand" size="lg" className="flex-1" onClick={handleRequestRevision} disabled={revisionLoading}>
                        {revisionLoading ? 'Submitting...' : 'Submit Revision Request'}
                      </GFButton>
                      <GFButton variant="ghost" size="lg" onClick={() => setView('delivery')}>Cancel</GFButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'review' && (
              <div className="max-w-2xl">
                {submitted ? (
                  <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: C.white, borderColor: C.border }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandLight})` }}>
                      <Check size={28} color="white" strokeWidth={3} />
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: C.ink }}>Review submitted!</h2>
                    <p className="text-sm mb-6" style={{ color: C.muted }}>Thank you for your feedback.</p>
                    <Link href="/search">
                      <GFButton variant="brand">Browse more services</GFButton>
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border p-6" style={{ backgroundColor: C.white, borderColor: C.border }}>
                    <h2 className="font-bold mb-1" style={{ color: C.ink }}>Leave a review</h2>
                    <p className="text-sm mb-6" style={{ color: C.muted }}>Share your experience to help other buyers and reward great sellers.</p>
                    <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ backgroundColor: C.surface }}>
                      <GFAvatar src={sellerAvatarUrl ?? undefined} name={sellerDisplayName} size="md" />
                      <div>
                        <p className="font-semibold text-sm" style={{ color: C.ink }}>{sellerDisplayName}</p>
                        <p className="text-xs" style={{ color: C.muted }}>{gigTitle} · {orderId.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 mb-5">
                      {(['overall', 'communication', 'delivery', 'quality'] as const).map((cat) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-sm capitalize" style={{ color: C.ink }}>{cat === 'overall' ? 'Overall experience' : cat}</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setReviewRatings((prev) => ({ ...prev, [cat]: n }))}
                                className="p-2 rounded-lg cursor-pointer touch-manipulation hover:bg-black/5 active:bg-black/10 transition-colors select-none min-w-[40px] min-h-[40px] flex items-center justify-center"
                              >
                                <Star
                                  size={24}
                                  fill={n <= reviewRatings[cat] ? C.brand : 'none'}
                                  stroke={n <= reviewRatings[cat] ? C.brand : C.border}
                                  strokeWidth={1.5}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <GFTextarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share what made this experience great (or not)..." rows={4} className="mb-5" />
                    {reviewError && (
                      <p className="text-sm mb-4" style={{ color: C.error }}>{reviewError}</p>
                    )}
                    <GFButton
                      variant="brand"
                      size="lg"
                      className="w-full"
                      disabled={reviewLoading}
                      onClick={async () => {
                        setReviewError(null);
                        setReviewLoading(true);
                        try {
                          const res = await fetch(`/api/orders/${orderId}/review`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              rating: reviewRatings.overall,
                              reviewText: reviewText.trim() || undefined,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to save review');
                          setSubmitted(true);
                          router.refresh();
                        } catch (err) {
                          setReviewError(err instanceof Error ? err.message : 'Failed to save review');
                        } finally {
                          setReviewLoading(false);
                        }
                      }}
                    >
                      {reviewLoading ? 'Saving...' : 'Submit Review'}
                    </GFButton>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
